#[allow(unused_imports)]
use std::path::Path;
#[allow(unused_imports)]
use std::process::Command;
#[allow(unused_imports)]
use std::time::Duration;

use serde::Deserialize;

/// A module entry returned by the PowerShell export script.
/// Contains the filename (e.g. "Module1.bas") and the COM
/// `VBComponent.Type` code (1=standard, 2=class, 3=form, 100=document).
#[derive(Debug, Deserialize)]
pub(crate) struct ExportedModule {
    pub filename: String,
    #[serde(rename = "type")]
    pub module_type: u32,
}

/// Sprint 23 / PBI #15 — structural fix for PS injection.
///
/// The PS scripts below are **fully static**: caller data (xlsm path,
/// output dir, module name/path) is NEVER concatenated into the script
/// body. Instead, values ride the OS env-var channel via
/// `Command::env("VERDE_*", ...)` and the script reads them back as
/// `$env:VERDE_*`. Because the script text is a compile-time constant,
/// there is no injection surface to mitigate — hence no validator, no
/// denylist. Unicode paths (e.g. Japanese filenames) previously blocked
/// by the Sprint-18 denylist now pass through untouched.
///
/// Env-var naming uses the `VERDE_` prefix to avoid collisions with any
/// env var the operator or a parent process might already have set.
/// PS `catch` block: emit the COM HRESULT as a locale-agnostic tag on
/// stderr so the Rust classifier can branch off the numeric code rather
/// than localised prose. Sprint 25 / PBI #17 — see `parse_hresult_tag` +
/// `classify_hresult` in `project.rs` for the consumer side.
///
/// We prefer `InnerException.HResult` when present because COM failures
/// typically surface via a wrapping `TargetInvocationException`; falling
/// back to `Exception.HResult` covers the direct-throw path. `throw` at
/// the end re-raises so the process still exits non-zero — the tag is
/// additive diagnostic output, not a swallow.
#[cfg(windows)]
macro_rules! hresult_catch {
    () => {
        r#"
} catch {
    $h = 0
    if ($_.Exception) {
        if ($_.Exception.InnerException -and $_.Exception.InnerException.HResult) {
            $h = $_.Exception.InnerException.HResult
        } elseif ($_.Exception.HResult) {
            $h = $_.Exception.HResult
        }
    }
    [Console]::Error.WriteLine(("VERDE_HRESULT=0x{0:X8}" -f $h))
    throw
"#
    };
}

/// Null-guards for `$wb` and `$wb.VBProject` after `excel_connect!`.
///
/// Two distinct failure modes require separate diagnostics:
///
/// 1. **`$wb` is null** — `excel_connect!` failed to find or open the
///    workbook.  Common causes: path-comparison mismatch between
///    `$w.FullName` and the env-var path (8.3 short names, UNC vs drive
///    letter), `Workbooks.Open` returning `$null` when `DisplayAlerts`
///    is off and the file is locked, or `GetActiveObject` connecting to
///    a different Excel instance that doesn't have the workbook open.
///    Tag: `VERDE_WB_NULL`.
///
/// 2. **`$wb.VBProject` is null** — workbook is open but VBProject is
///    inaccessible.  Most likely cause: Trust Center setting "Trust
///    access to the VBA project object model" is disabled. Can also
///    happen when the VBA project is password-protected.
///    Tag: `VERDE_TRUST_DENIED`.
///
/// PowerShell silently returns `$null` for property access on null
/// objects (no exception thrown), so without these guards the failure
/// manifests as a generic "null-valued expression" error at the first
/// *method call* (`Import`, `Remove`, `Export`), far from the root
/// cause.  The tags are locale-agnostic so the Rust classifier can
/// branch on them deterministically.
#[cfg(windows)]
macro_rules! vbproject_guard {
    () => {
        r#"
    if (-not $wb) {
        [Console]::Error.WriteLine("VERDE_WB_NULL")
        throw "Workbook reference is null after connection attempt. The workbook may not have been found or opened successfully."
    }
    if (-not $wb.VBProject) {
        [Console]::Error.WriteLine("VERDE_TRUST_DENIED")
        throw "Cannot access VBProject. Enable 'Trust access to the VBA project object model' in Excel Trust Center settings."
    }
"#
    };
}

/// Reuse an already-running Excel instance and its open workbook when
/// possible.  Falls back to `New-Object` → `Workbooks.Open` if no active
/// Excel process or the target file is not yet open.
///
/// **Same-name conflict fallback**: Excel cannot hold two workbooks with
/// the same filename, even from different directories.  When
/// `GetActiveObject` finds a running instance that already has a
/// same-named workbook open at a *different* path, `Workbooks.Open`
/// returns `$null` (because `DisplayAlerts` is off, the confirmation
/// dialog is suppressed).  In that case we abandon the existing instance
/// and create a dedicated one where `Open` will succeed.
///
/// Exposes `$ownExcel` / `$ownWb` / `$savedAlerts` so that
/// `excel_disconnect!` knows what to clean up.
#[cfg(windows)]
macro_rules! excel_connect {
    () => {
        r#"
$xlsmFull = [System.IO.Path]::GetFullPath($xlsmPath)
$ownExcel = $false
$ownWb = $false
$savedAlerts = $true
try {
    $excel = [System.Runtime.InteropServices.Marshal]::GetActiveObject('Excel.Application')
} catch {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $ownExcel = $true
}
$savedAlerts = $excel.DisplayAlerts
$excel.DisplayAlerts = $false
$wb = $null
foreach ($w in $excel.Workbooks) {
    try {
        if ([System.IO.Path]::GetFullPath($w.FullName) -eq $xlsmFull) {
            $wb = $w
            break
        }
    } catch { }
}
if (-not $wb) {
    $wb = $excel.Workbooks.Open($xlsmFull)
    $ownWb = $true
}
if (-not $wb -and -not $ownExcel) {
    $excel.DisplayAlerts = $savedAlerts
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $ownExcel = $true
    $savedAlerts = $excel.DisplayAlerts
    $excel.DisplayAlerts = $false
    $wb = $excel.Workbooks.Open($xlsmFull)
    $ownWb = $true
}
"#
    };
}

/// Restore `DisplayAlerts`, close the workbook only if we opened it,
/// and quit Excel only if we launched it.
/// Null-guards `$excel` / `$wb` so the `finally` block never crashes
/// when `excel_connect` failed before assigning them.
#[cfg(windows)]
macro_rules! excel_disconnect {
    () => {
        r#"
    if ($excel) { $excel.DisplayAlerts = $savedAlerts }
    if ($ownWb -and $wb) { $wb.Close($false) }
    if ($ownExcel -and $excel) {
        $excel.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
    }
"#
    };
}

#[cfg(windows)]
const EXPORT_SCRIPT: &str = concat!(
    r#"
$xlsmPath  = $env:VERDE_XLSM_PATH
$outputDir = $env:VERDE_OUTPUT_DIR
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open($xlsmPath)
"#,
    vbproject_guard!(),
    r#"
    $modules = @()
    foreach ($comp in $wb.VBProject.VBComponents) {
        $ext = switch ($comp.Type) {
            1 { ".bas" }
            2 { ".cls" }
            3 { ".frm" }
            100 { ".cls" }
            default { ".bas" }
        }
        $filename = $comp.Name + $ext
        $filepath = Join-Path $outputDir $filename
        $comp.Export($filepath)
        $modules += [PSCustomObject]@{ filename = $filename; type = [int]$comp.Type }
    }
    $wb.Close($false)
    $modules | ConvertTo-Json -Compress
"#,
    hresult_catch!(),
    r#"
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
"#
);

#[cfg(windows)]
const IMPORT_SCRIPT: &str = concat!(
    r#"
$xlsmPath   = $env:VERDE_XLSM_PATH
$moduleName = $env:VERDE_MODULE_NAME
$modulePath = $env:VERDE_MODULE_PATH
$ErrorActionPreference = 'Stop'
try {
"#,
    excel_connect!(),
    vbproject_guard!(),
    r#"
    $existing = $wb.VBProject.VBComponents | Where-Object { $_.Name -eq $moduleName }
    if ($existing -and $existing.Type -ne 100) {
        $wb.VBProject.VBComponents.Remove($existing)
    }
    if ($existing -and $existing.Type -eq 100) {
        $lines = [System.IO.File]::ReadAllLines($modulePath, [System.Text.Encoding]::UTF8)
        $codeStart = 0
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^Attribute VB_') { $codeStart = $i + 1 }
        }
        if ($codeStart -lt $lines.Count) {
            $code = [string]::Join("`r`n", $lines[$codeStart..($lines.Count - 1)])
        } else {
            $code = ''
        }
        $existing.CodeModule.DeleteLines(1, $existing.CodeModule.CountOfLines)
        if ($code.Trim().Length -gt 0) {
            $existing.CodeModule.AddFromString($code)
        }
    } else {
        $ext = [System.IO.Path]::GetExtension($modulePath)
        $tempPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'verde_import' + $ext)
        try {
            $text = [System.IO.File]::ReadAllText($modulePath, [System.Text.Encoding]::UTF8)
            [System.IO.File]::WriteAllText($tempPath, $text, [System.Text.Encoding]::Default)
            $wb.VBProject.VBComponents.Import($tempPath)
        } finally {
            Remove-Item $tempPath -ErrorAction SilentlyContinue
        }
    }
    $wb.Save()
"#,
    hresult_catch!(),
    r#"
} finally {
"#,
    excel_disconnect!(),
    r#"
}
"#
);

/// Batch import: open Excel once, import all modules, save once.
/// VERDE_MODULES_JSON carries a JSON array of filenames; VERDE_SOURCE_DIR
/// is the directory containing those files.
#[cfg(windows)]
const IMPORT_BATCH_SCRIPT: &str = concat!(
    r#"
$xlsmPath  = $env:VERDE_XLSM_PATH
$sourceDir = $env:VERDE_SOURCE_DIR
$modules   = $env:VERDE_MODULES_JSON | ConvertFrom-Json
$ErrorActionPreference = 'Stop'
try {
"#,
    excel_connect!(),
    vbproject_guard!(),
    r#"
    foreach ($filename in $modules) {
        $moduleName = [System.IO.Path]::GetFileNameWithoutExtension($filename)
        $modulePath = Join-Path $sourceDir $filename
        $existing = $wb.VBProject.VBComponents | Where-Object { $_.Name -eq $moduleName }
        if ($existing -and $existing.Type -ne 100) {
            $wb.VBProject.VBComponents.Remove($existing)
        }
        if ($existing -and $existing.Type -eq 100) {
            $lines = [System.IO.File]::ReadAllLines($modulePath, [System.Text.Encoding]::UTF8)
            $codeStart = 0
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match '^Attribute VB_') { $codeStart = $i + 1 }
            }
            if ($codeStart -lt $lines.Count) {
                $code = [string]::Join("`r`n", $lines[$codeStart..($lines.Count - 1)])
            } else {
                $code = ''
            }
            $existing.CodeModule.DeleteLines(1, $existing.CodeModule.CountOfLines)
            if ($code.Trim().Length -gt 0) {
                $existing.CodeModule.AddFromString($code)
            }
        } else {
            $ext = [System.IO.Path]::GetExtension($modulePath)
            $tempPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), 'verde_import_' + $moduleName + $ext)
            try {
                $text = [System.IO.File]::ReadAllText($modulePath, [System.Text.Encoding]::UTF8)
                [System.IO.File]::WriteAllText($tempPath, $text, [System.Text.Encoding]::Default)
                $wb.VBProject.VBComponents.Import($tempPath)
            } finally {
                Remove-Item $tempPath -ErrorAction SilentlyContinue
            }
        }
    }
    $wb.Save()
"#,
    hresult_catch!(),
    r#"
} finally {
"#,
    excel_disconnect!(),
    r#"
}
"#
);

/// Default timeout for PowerShell COM operations. COM calls to Excel
/// can be slow (large workbooks, network paths, plugin initialization)
/// but anything beyond 60 seconds indicates a likely hang.
#[cfg(windows)]
const PS_TIMEOUT: Duration = Duration::from_secs(60);

/// Run a pre-configured `Command` with a timeout. Spawns the child
/// process and waits on a background thread; if the deadline expires,
/// the process tree is killed via `taskkill /T`.
#[cfg(windows)]
fn run_with_timeout(
    cmd: &mut Command,
    timeout: Duration,
) -> Result<std::process::Output, Box<dyn std::error::Error>> {
    use std::sync::mpsc;

    let child = cmd.spawn()?;
    let child_id = child.id();
    let (tx, rx) = mpsc::channel();

    std::thread::spawn(move || {
        let _ = tx.send(child.wait_with_output());
    });

    match rx.recv_timeout(timeout) {
        Ok(result) => Ok(result?),
        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
            // Kill the entire process tree (PowerShell + any COM child).
            let _ = Command::new("taskkill")
                .args(["/F", "/T", "/PID", &child_id.to_string()])
                .output();
            Err(format!(
                "PowerShell operation timed out after {} seconds",
                timeout.as_secs()
            )
            .into())
        }
        Err(e) => Err(format!("Failed to wait for PowerShell process: {e}").into()),
    }
}

pub struct VbaBridge;

impl VbaBridge {
    /// PowerShell COM 経由で VBA コードをエクスポート
    #[cfg(windows)]
    pub async fn export(
        xlsm_path: &str,
        output_dir: &str,
    ) -> Result<Vec<ExportedModule>, Box<dyn std::error::Error>> {
        let output = run_with_timeout(
            Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-Command",
                    EXPORT_SCRIPT,
                ])
                .env("VERDE_XLSM_PATH", xlsm_path)
                .env("VERDE_OUTPUT_DIR", output_dir),
            PS_TIMEOUT,
        )?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell export failed: {}", stderr).into());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let modules: Vec<ExportedModule> = serde_json::from_str(&stdout)?;
        Ok(modules)
    }

    /// PowerShell COM 経由で VBA コードをインポート
    #[cfg(windows)]
    pub async fn import(
        xlsm_path: &str,
        source_dir: &str,
        module_filename: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let module_path = Path::new(source_dir).join(module_filename);
        let module_name = Path::new(module_filename)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy();
        let module_path_str = module_path.to_string_lossy();

        let output = run_with_timeout(
            Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-Command",
                    IMPORT_SCRIPT,
                ])
                .env("VERDE_XLSM_PATH", xlsm_path)
                .env("VERDE_MODULE_NAME", module_name.as_ref())
                .env("VERDE_MODULE_PATH", module_path_str.as_ref()),
            PS_TIMEOUT,
        )?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell import failed: {}", stderr).into());
        }

        Ok(())
    }

    /// Batch-import multiple modules in a single PowerShell/Excel session.
    /// Opens the workbook once, imports all modules, saves once, closes once.
    #[cfg(windows)]
    pub async fn import_batch(
        xlsm_path: &str,
        source_dir: &str,
        module_filenames: &[&str],
    ) -> Result<(), Box<dyn std::error::Error>> {
        if module_filenames.is_empty() {
            return Ok(());
        }

        let modules_json = serde_json::to_string(module_filenames)?;

        let output = run_with_timeout(
            Command::new("powershell")
                .args([
                    "-NoProfile",
                    "-ExecutionPolicy",
                    "Bypass",
                    "-Command",
                    IMPORT_BATCH_SCRIPT,
                ])
                .env("VERDE_XLSM_PATH", xlsm_path)
                .env("VERDE_SOURCE_DIR", source_dir)
                .env("VERDE_MODULES_JSON", &modules_json),
            PS_TIMEOUT,
        )?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell batch import failed: {}", stderr).into());
        }

        Ok(())
    }

    #[cfg(not(windows))]
    pub async fn export(
        _xlsm_path: &str,
        _output_dir: &str,
    ) -> Result<Vec<ExportedModule>, Box<dyn std::error::Error>> {
        Err("VBA bridge requires Windows with Excel installed".into())
    }

    #[cfg(not(windows))]
    pub async fn import(
        _xlsm_path: &str,
        _source_dir: &str,
        _module_filename: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        Err("VBA bridge requires Windows with Excel installed".into())
    }

    #[cfg(not(windows))]
    pub async fn import_batch(
        _xlsm_path: &str,
        _source_dir: &str,
        module_filenames: &[&str],
    ) -> Result<(), Box<dyn std::error::Error>> {
        if module_filenames.is_empty() {
            return Ok(());
        }
        Err("VBA bridge requires Windows with Excel installed".into())
    }
}

#[cfg(test)]
mod tests {
    // Characterization tests: pin the non-Windows error contract so refactors to the Windows COM bridge cannot silently drift the cross-platform surface.
    use super::*;

    /// Drive a Future to completion on the current thread without pulling
    /// in tokio (not a workspace dep). Adequate here because the
    /// non-Windows branches return `Ready(Err(..))` synchronously —
    /// no real awaiting happens. Mirrors the helper in commands.rs.
    #[cfg(not(target_os = "windows"))]
    fn block_on<F: std::future::Future>(mut fut: F) -> F::Output {
        use std::pin::Pin;
        use std::task::{Context, Poll, RawWaker, RawWakerVTable, Waker};
        const VTABLE: RawWakerVTable = RawWakerVTable::new(
            |_| RawWaker::new(std::ptr::null(), &VTABLE),
            |_| {},
            |_| {},
            |_| {},
        );
        let waker = unsafe { Waker::from_raw(RawWaker::new(std::ptr::null(), &VTABLE)) };
        let mut cx = Context::from_waker(&waker);
        // Safety: fut is owned by this stack frame and never moved after
        // pinning here.
        let mut fut = unsafe { Pin::new_unchecked(&mut fut) };
        loop {
            if let Poll::Ready(v) = fut.as_mut().poll(&mut cx) {
                return v;
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn export_on_non_windows_returns_error_mentioning_windows_requirement() {
        let result = block_on(VbaBridge::export("dummy.xlsm", "/tmp/ignored"));
        let err = result.expect_err("non-Windows export must return Err");
        let msg = err.to_string();
        assert!(
            msg.contains("VBA bridge requires Windows"),
            "error message should pin the Windows-requirement contract, got: {msg}"
        );
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn import_on_non_windows_returns_error_mentioning_windows_requirement() {
        let result = block_on(VbaBridge::import(
            "dummy.xlsm",
            "/tmp/ignored",
            "Module1.bas",
        ));
        let err = result.expect_err("non-Windows import must return Err");
        let msg = err.to_string();
        assert!(
            msg.contains("VBA bridge requires Windows"),
            "error message should pin the Windows-requirement contract, got: {msg}"
        );
    }

    // --- Sprint 23 / PBI #15: env-var passing contract ---
    //
    // Caller data rides `$env:VERDE_*` instead of the PS script body, so
    // there is no PS-sensitive surface to mitigate. Injection-flavored
    // input reaches the platform-not-supported branch unchanged.

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn export_injection_flavored_input_surfaces_platform_error_not_validator_error() {
        let result = block_on(VbaBridge::export(
            r#"evil"; calc; #.xlsm"#,
            "/tmp/ignored",
        ));
        let err = result.expect_err("non-Windows must still error out");
        let msg = err.to_string();
        assert!(
            msg.contains("VBA bridge requires Windows"),
            "env-var path must expose no PS-sensitive surface to mitigate, got: {msg}"
        );
        assert!(
            !msg.contains("PowerShell-sensitive"),
            "validator must be gone — injection is structurally impossible, got: {msg}"
        );
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn import_batch_on_non_windows_returns_error_mentioning_windows_requirement() {
        let result = block_on(VbaBridge::import_batch(
            "dummy.xlsm",
            "/tmp/ignored",
            &["Module1.bas", "Sheet1.cls"],
        ));
        let err = result.expect_err("non-Windows import_batch must return Err");
        let msg = err.to_string();
        assert!(
            msg.contains("VBA bridge requires Windows"),
            "error message should pin the Windows-requirement contract, got: {msg}"
        );
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn import_batch_empty_list_returns_ok_without_calling_powershell() {
        let result = block_on(VbaBridge::import_batch(
            "dummy.xlsm",
            "/tmp/ignored",
            &[],
        ));
        assert!(result.is_ok(), "empty batch should be a no-op Ok(())");
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn import_injection_flavored_module_filename_surfaces_platform_error_not_validator_error() {
        let result = block_on(VbaBridge::import(
            "dummy.xlsm",
            "/tmp/ignored",
            r#""; rm -rf /; #.bas"#,
        ));
        let err = result.expect_err("non-Windows must still error out");
        let msg = err.to_string();
        assert!(
            msg.contains("VBA bridge requires Windows"),
            "env-var path must expose no PS-sensitive surface to mitigate, got: {msg}"
        );
        assert!(
            !msg.contains("PowerShell-sensitive"),
            "validator must be gone — injection is structurally impossible, got: {msg}"
        );
    }
}
