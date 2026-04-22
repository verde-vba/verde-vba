#[allow(unused_imports)]
use std::path::Path;
#[allow(unused_imports)]
use std::process::Command;

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
        $modules += $filename
    }
    $wb.Close($false)
    $modules | ConvertTo-Json
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
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open($xlsmPath)
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
    $wb.Close($false)
"#,
    hresult_catch!(),
    r#"
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
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
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open($xlsmPath)
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
    $wb.Close($false)
"#,
    hresult_catch!(),
    r#"
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
"#
);

pub struct VbaBridge;

impl VbaBridge {
    /// PowerShell COM 経由で VBA コードをエクスポート
    #[cfg(windows)]
    pub async fn export(
        xlsm_path: &str,
        output_dir: &str,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                EXPORT_SCRIPT,
            ])
            .env("VERDE_XLSM_PATH", xlsm_path)
            .env("VERDE_OUTPUT_DIR", output_dir)
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell export failed: {}", stderr).into());
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let modules: Vec<String> = serde_json::from_str(&stdout)?;
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

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                IMPORT_SCRIPT,
            ])
            .env("VERDE_XLSM_PATH", xlsm_path)
            .env("VERDE_MODULE_NAME", module_name.as_ref())
            .env("VERDE_MODULE_PATH", module_path_str.as_ref())
            .output()?;

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

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                IMPORT_BATCH_SCRIPT,
            ])
            .env("VERDE_XLSM_PATH", xlsm_path)
            .env("VERDE_SOURCE_DIR", source_dir)
            .env("VERDE_MODULES_JSON", &modules_json)
            .output()?;

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
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
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
