#[allow(unused_imports)]
use std::path::Path;
#[allow(unused_imports)]
use std::process::Command;

pub struct VbaBridge;

impl VbaBridge {
    /// PowerShell COM 経由で VBA コードをエクスポート
    #[cfg(windows)]
    pub async fn export(
        xlsm_path: &str,
        output_dir: &str,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let script = format!(
            r#"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {{
    $wb = $excel.Workbooks.Open("{xlsm_path}")
    $modules = @()
    foreach ($comp in $wb.VBProject.VBComponents) {{
        $ext = switch ($comp.Type) {{
            1 {{ ".bas" }}
            2 {{ ".cls" }}
            3 {{ ".frm" }}
            100 {{ ".cls" }}
            default {{ ".bas" }}
        }}
        $filename = $comp.Name + $ext
        $filepath = Join-Path "{output_dir}" $filename
        $comp.Export($filepath)
        $modules += $filename
    }}
    $wb.Close($false)
    $modules | ConvertTo-Json
}} finally {{
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}}
"#
        );

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
        let module_path = Path::new(source_dir).join(module_filename);
        let module_name = Path::new(module_filename)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy();

        let script = format!(
            r#"
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {{
    $wb = $excel.Workbooks.Open("{xlsm_path}")
    $existing = $wb.VBProject.VBComponents | Where-Object {{ $_.Name -eq "{module_name}" }}
    if ($existing -and $existing.Type -ne 100) {{
        $wb.VBProject.VBComponents.Remove($existing)
    }}
    if ($existing -and $existing.Type -eq 100) {{
        $code = Get-Content "{}" -Raw
        $existing.CodeModule.DeleteLines(1, $existing.CodeModule.CountOfLines)
        $existing.CodeModule.AddFromString($code)
    }} else {{
        $wb.VBProject.VBComponents.Import("{}")
    }}
    $wb.Save()
    $wb.Close($false)
}} finally {{
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}}
"#,
            module_path.display(),
            module_path.display()
        );

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
}
