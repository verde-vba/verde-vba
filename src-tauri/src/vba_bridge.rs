#[allow(unused_imports)]
use std::path::Path;
#[allow(unused_imports)]
use std::process::Command;

/// Sprint 18 / PBI #2 — PowerShell argument sanitization.
///
/// `vba_bridge` embeds caller-supplied strings (`xlsm_path`, `output_dir`,
/// `module_name`, `module_path`) directly into a PS `-Command` script via
/// `format!`. The script uses double-quoted string literals, so any `"`,
/// `` ` ``, `$`, newline, or `;` in the input can either terminate the
/// string, invoke PS substitution, or chain a new command. Concretely:
/// a workbook whose `VB_Name` is `"; Start-Process calc.exe; #` would let
/// an attacker execute arbitrary PowerShell on `export`.
///
/// The MVP mitigation is a strict whitelist: paths and identifiers must
/// consist of printable ASCII minus the PS-sensitive set. The long-term
/// fix is to pass arguments through `-ArgumentList` (param block) so the
/// script body never concatenates them — tracked as follow-up #15.
///
/// Cross-platform: this validator is deliberately NOT `#[cfg(windows)]`,
/// so it can be unit-tested on the darwin dev environment where the COM
/// code paths are compiled out.
pub(crate) fn validate_ps_arg(kind: &str, s: &str) -> Result<(), String> {
    if s.is_empty() {
        return Err(format!("{kind} must not be empty"));
    }
    for (i, ch) in s.chars().enumerate() {
        let forbidden = matches!(ch, '"' | '`' | '$' | ';' | '\n' | '\r' | '\0')
            || (ch.is_control() && ch != '\t');
        if forbidden {
            return Err(format!(
                "{kind} contains PowerShell-sensitive character {:?} at byte {i}",
                ch
            ));
        }
    }
    Ok(())
}

/// Sprint 23 / PBI #15 preparatory structural tidy (Tidy First).
///
/// Hoisting the PS body out of `format!` lets Commit 3 swap in `$env:*`
/// references without touching control flow — substitution is routed
/// through placeholder tokens (`{XLSM_PATH}` etc.) today, through OS env
/// vars tomorrow. The script text itself stops being Rust-format-escaped
/// (`{{` / `}}` → `{` / `}`), which also improves grep / copy-paste
/// fidelity against the real PowerShell the process executes.
#[cfg(windows)]
const EXPORT_SCRIPT_TEMPLATE: &str = r#"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open("{XLSM_PATH}")
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
        $filepath = Join-Path "{OUTPUT_DIR}" $filename
        $comp.Export($filepath)
        $modules += $filename
    }
    $wb.Close($false)
    $modules | ConvertTo-Json
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
"#;

#[cfg(windows)]
const IMPORT_SCRIPT_TEMPLATE: &str = r#"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $wb = $excel.Workbooks.Open("{XLSM_PATH}")
    $existing = $wb.VBProject.VBComponents | Where-Object { $_.Name -eq "{MODULE_NAME}" }
    if ($existing -and $existing.Type -ne 100) {
        $wb.VBProject.VBComponents.Remove($existing)
    }
    if ($existing -and $existing.Type -eq 100) {
        $code = Get-Content "{MODULE_PATH}" -Raw
        $existing.CodeModule.DeleteLines(1, $existing.CodeModule.CountOfLines)
        $existing.CodeModule.AddFromString($code)
    } else {
        $wb.VBProject.VBComponents.Import("{MODULE_PATH}")
    }
    $wb.Save()
    $wb.Close($false)
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
"#;

pub struct VbaBridge;

impl VbaBridge {
    /// PowerShell COM 経由で VBA コードをエクスポート
    #[cfg(windows)]
    pub async fn export(
        xlsm_path: &str,
        output_dir: &str,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        validate_ps_arg("xlsm_path", xlsm_path)?;
        validate_ps_arg("output_dir", output_dir)?;
        let script = EXPORT_SCRIPT_TEMPLATE
            .replace("{XLSM_PATH}", xlsm_path)
            .replace("{OUTPUT_DIR}", output_dir);

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &script,
            ])
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
        validate_ps_arg("xlsm_path", xlsm_path)?;
        validate_ps_arg("source_dir", source_dir)?;
        validate_ps_arg("module_filename", module_filename)?;
        let module_path = Path::new(source_dir).join(module_filename);
        let module_name = Path::new(module_filename)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy();
        // module_name is derived from module_filename (already validated),
        // but file_stem strips the extension and could theoretically yield
        // content a future refactor mutates — re-validate defensively.
        validate_ps_arg("module_name", &module_name)?;
        let module_path_str = module_path.to_string_lossy();
        validate_ps_arg("module_path", &module_path_str)?;

        let script = IMPORT_SCRIPT_TEMPLATE
            .replace("{XLSM_PATH}", xlsm_path)
            .replace("{MODULE_NAME}", &module_name)
            .replace("{MODULE_PATH}", &module_path_str);

        let output = Command::new("powershell")
            .args([
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                &script,
            ])
            .output()?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("PowerShell import failed: {}", stderr).into());
        }

        Ok(())
    }

    #[cfg(not(windows))]
    pub async fn export(
        xlsm_path: &str,
        output_dir: &str,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        // Run the sanitizer first so darwin CI exercises the same validation
        // surface that gates the Windows COM path. Bad input returns the
        // sanitizer error regardless of platform; clean input falls through
        // to the platform-not-supported error on non-Windows.
        validate_ps_arg("xlsm_path", xlsm_path)?;
        validate_ps_arg("output_dir", output_dir)?;
        Err("VBA bridge requires Windows with Excel installed".into())
    }

    #[cfg(not(windows))]
    pub async fn import(
        xlsm_path: &str,
        source_dir: &str,
        module_filename: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        validate_ps_arg("xlsm_path", xlsm_path)?;
        validate_ps_arg("source_dir", source_dir)?;
        validate_ps_arg("module_filename", module_filename)?;
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

    // --- Sprint 18 / PBI #2: validate_ps_arg ---

    #[test]
    fn validate_ps_arg_accepts_plain_windows_path() {
        assert!(validate_ps_arg("xlsm_path", r"C:\work\sales.xlsm").is_ok());
        assert!(validate_ps_arg("output_dir", r"C:\Users\tanaka\AppData\Roaming\verde\projects\abc").is_ok());
        assert!(validate_ps_arg("module", "Module1.bas").is_ok());
    }

    #[test]
    fn validate_ps_arg_rejects_empty_string() {
        let err = validate_ps_arg("xlsm_path", "").expect_err("empty must be rejected");
        assert!(err.contains("must not be empty"));
    }

    #[test]
    fn validate_ps_arg_rejects_double_quote() {
        // The canonical attack: closing the PS string to chain a new command.
        let err = validate_ps_arg(
            "module_name",
            r#""; Start-Process calc.exe; #"#,
        )
        .expect_err("double-quote injection must be rejected");
        assert!(err.contains("PowerShell-sensitive"));
    }

    #[test]
    fn validate_ps_arg_rejects_backtick() {
        // Backtick is the PowerShell escape character — also enables
        // subexpression chicanery like `"a`"b"`.
        let err = validate_ps_arg("module_name", "evil`Command")
            .expect_err("backtick must be rejected");
        assert!(err.contains("PowerShell-sensitive"));
    }

    #[test]
    fn validate_ps_arg_rejects_dollar_sign() {
        // `$(...)` and plain `$var` trigger PS substitution inside double
        // quoted strings — must not reach the format! call.
        let err = validate_ps_arg("xlsm_path", "C:/$(Invoke-Expression).xlsm")
            .expect_err("dollar-sign must be rejected");
        assert!(err.contains("PowerShell-sensitive"));
    }

    #[test]
    fn validate_ps_arg_rejects_semicolon_and_newlines() {
        assert!(validate_ps_arg("module", "a;b").is_err());
        assert!(validate_ps_arg("module", "a\nb").is_err());
        assert!(validate_ps_arg("module", "a\rb").is_err());
        assert!(validate_ps_arg("module", "a\0b").is_err());
    }

    #[test]
    fn validate_ps_arg_error_message_pins_attack_vector_context() {
        // The error must name the kind so a downstream log / UI can show
        // "xlsm_path had a forbidden character" vs "module_name had it".
        let err = validate_ps_arg("xlsm_path", r#"bad"path"#).unwrap_err();
        assert!(err.starts_with("xlsm_path"), "got: {err}");
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn export_rejects_injected_xlsm_path_before_platform_check() {
        // Even though the non-Windows branch normally short-circuits with a
        // Windows-requirement error, the validator must fire first so CI on
        // darwin / Linux still catches injection attempts.
        let result = block_on(VbaBridge::export(
            r#"evil"; calc; #.xlsm"#,
            "/tmp/ignored",
        ));
        let err = result.expect_err("injected xlsm_path must error out");
        let msg = err.to_string();
        assert!(
            msg.contains("PowerShell-sensitive"),
            "validator error must precede platform error, got: {msg}"
        );
    }

    #[cfg(not(target_os = "windows"))]
    #[test]
    fn import_rejects_injected_module_filename_before_platform_check() {
        let result = block_on(VbaBridge::import(
            "dummy.xlsm",
            "/tmp/ignored",
            r#""; rm -rf /; #.bas"#,
        ));
        let err = result.expect_err("injected module_filename must error out");
        let msg = err.to_string();
        assert!(
            msg.contains("PowerShell-sensitive"),
            "validator error must precede platform error, got: {msg}"
        );
    }
}
