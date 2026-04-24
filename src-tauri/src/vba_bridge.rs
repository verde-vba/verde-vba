#[allow(unused_imports)]
use std::path::Path;
#[allow(unused_imports)]
use std::time::Duration;

use serde::Deserialize;

/// A module entry returned by the export operation.
/// Contains the filename (e.g. "Module1.bas") and the COM
/// `VBComponent.Type` code (1=standard, 2=class, 3=form, 100=document).
#[derive(Debug, Deserialize)]
pub(crate) struct ExportedModule {
    pub filename: String,
    #[serde(rename = "type")]
    pub module_type: u32,
}

// ── Windows-only: direct COM via windows-rs ─────────────────────────

#[cfg(windows)]
use crate::com_dispatch::{
    create_instance, get_active_object, run_on_sta_thread, system_encoding, variant_bstr,
    DispatchObject, VbaBridgeError,
};

/// Timeout for COM operations. COM calls to Excel can be slow (large
/// workbooks, network paths, plugin initialisation) but anything beyond
/// 60 seconds indicates a likely hang.
#[cfg(windows)]
const COM_TIMEOUT: Duration = Duration::from_secs(60);

/// Excel COM session — tracks ownership so cleanup only closes/quits
/// resources that this session opened.
#[cfg(windows)]
struct ExcelSession {
    excel: DispatchObject,
    wb: DispatchObject,
    own_excel: bool,
    own_wb: bool,
    saved_alerts: bool,
}

/// Connect to an existing Excel instance and find (or open) the
/// workbook. Falls back to creating a new Excel instance when needed.
///
/// Mirrors the logic of the old `excel_connect!` PowerShell macro:
/// 1. Try `GetActiveObject("Excel.Application")`
/// 2. Search running workbooks by FullName match
/// 3. Open the workbook if not found
/// 4. Same-name conflict fallback: create dedicated instance
#[cfg(windows)]
fn excel_connect(xlsm_path: &str) -> Result<ExcelSession, VbaBridgeError> {
    let xlsm_full = std::fs::canonicalize(xlsm_path)
        .map_err(|e| VbaBridgeError::Other(format!("Failed to canonicalize path: {e}")))?;
    let xlsm_full_str = xlsm_full.to_string_lossy();
    // Strip \\?\ prefix added by canonicalize on Windows.
    let xlsm_full_str = xlsm_full_str
        .strip_prefix(r"\\?\")
        .unwrap_or(&xlsm_full_str);

    let mut own_excel = false;
    let mut own_wb = false;

    // Step 1: Try to reuse a running Excel instance.
    let excel = match get_active_object("Excel.Application") {
        Ok(e) => e,
        Err(_) => {
            own_excel = true;
            let e = create_instance("Excel.Application")?;
            e.put_bool("Visible", false)?;
            e
        }
    };

    let saved_alerts = excel.get_bool("DisplayAlerts").unwrap_or(true);
    excel.put_bool("DisplayAlerts", false)?;

    // Step 2: Search open workbooks by full path.
    let mut wb_found: Option<DispatchObject> = None;
    let workbooks = excel.get("Workbooks")?;
    let count = workbooks.count()?;
    for i in 1..=count {
        if let Ok(w) = workbooks.item(i) {
            if let Ok(full_name) = w.get_string("FullName") {
                // Canonicalize the COM-returned path for comparison.
                if let Ok(canon) = std::fs::canonicalize(&full_name) {
                    let canon_str = canon.to_string_lossy();
                    let canon_str = canon_str.strip_prefix(r"\\?\").unwrap_or(&canon_str);
                    if canon_str.eq_ignore_ascii_case(xlsm_full_str) {
                        wb_found = Some(w);
                        break;
                    }
                }
            }
        }
    }

    // Step 3: Open the workbook if not found.
    let wb = if let Some(w) = wb_found {
        w
    } else {
        match workbooks.call_get("Open", &mut [variant_bstr(xlsm_full_str)]) {
            Ok(w) => {
                own_wb = true;
                w
            }
            Err(e) => {
                // Step 4: Same-name conflict fallback.
                // Excel cannot hold two workbooks with the same filename
                // from different directories. When the existing instance
                // has a same-named workbook, Open fails. Abandon the
                // existing instance and create a dedicated one.
                if !own_excel {
                    excel.put_bool("DisplayAlerts", saved_alerts).ok();
                    let excel2 = create_instance("Excel.Application")?;
                    excel2.put_bool("Visible", false)?;
                    let saved2 = excel2.get_bool("DisplayAlerts").unwrap_or(true);
                    excel2.put_bool("DisplayAlerts", false)?;
                    let wbs2 = excel2.get("Workbooks")?;
                    let wb2 = wbs2.call_get("Open", &mut [variant_bstr(xlsm_full_str)])?;
                    return Ok(ExcelSession {
                        excel: excel2,
                        wb: wb2,
                        own_excel: true,
                        own_wb: true,
                        saved_alerts: saved2,
                    });
                }
                return Err(e);
            }
        }
    };

    Ok(ExcelSession {
        excel,
        wb,
        own_excel,
        own_wb,
        saved_alerts,
    })
}

/// Restore DisplayAlerts, close the workbook (if owned), quit Excel
/// (if owned). Best-effort: errors during cleanup are swallowed.
#[cfg(windows)]
fn excel_disconnect(session: ExcelSession) {
    session
        .excel
        .put_bool("DisplayAlerts", session.saved_alerts)
        .ok();
    if session.own_wb {
        session
            .wb
            .call_void("Close", &mut [false.into()])
            .ok();
    }
    if session.own_excel {
        session.excel.call_void("Quit", &mut []).ok();
    }
}

/// Check that the workbook and its VBProject are accessible.
/// Returns the VBProject dispatch object on success.
#[cfg(windows)]
fn vbproject_guard(wb: &DispatchObject) -> Result<DispatchObject, VbaBridgeError> {
    // The workbook itself was already obtained, but double-check it's
    // not a dead reference.
    if wb.is_null_or_empty("Name") {
        return Err(VbaBridgeError::WorkbookNull);
    }
    match wb.get("VBProject") {
        Ok(vbp) => {
            // Verify the VBProject is actually accessible by reading a
            // property. If Trust Center blocks access, this will fail.
            if vbp.is_null_or_empty("Name") {
                Err(VbaBridgeError::TrustDenied)
            } else {
                Ok(vbp)
            }
        }
        Err(_) => Err(VbaBridgeError::TrustDenied),
    }
}

/// Map VBComponent.Type to file extension.
#[cfg(windows)]
fn ext_for_type(type_code: i32) -> &'static str {
    match type_code {
        1 => ".bas",
        2 => ".cls",
        3 => ".frm",
        100 => ".cls",
        _ => ".bas",
    }
}

/// Find a VBComponent by name in the VBComponents collection.
/// Returns `Ok(None)` if not found.
#[cfg(windows)]
fn find_component_by_name(
    components: &DispatchObject,
    module_name: &str,
) -> Result<Option<DispatchObject>, VbaBridgeError> {
    let count = components.count()?;
    for i in 1..=count {
        let comp = components.item(i)?;
        if let Ok(name) = comp.get_string("Name") {
            if name.eq_ignore_ascii_case(module_name) {
                return Ok(Some(comp));
            }
        }
    }
    Ok(None)
}

/// Import a single module into the workbook via COM.
/// Handles the document module (type=100) special case.
#[cfg(windows)]
fn import_module_com(
    components: &DispatchObject,
    module_name: &str,
    module_path: &Path,
) -> Result<(), VbaBridgeError> {
    let existing = find_component_by_name(components, module_name)?;

    if let Some(ref comp) = existing {
        let type_code = comp.get_i32("Type").unwrap_or(0);
        if type_code == 100 {
            // Document module: cannot remove/reimport. Patch the
            // CodeModule in place — same logic as the old PS bridge.
            let content = std::fs::read_to_string(module_path)
                .map_err(|e| VbaBridgeError::Other(format!("Failed to read module file: {e}")))?;

            // Strip Attribute VB_ headers.
            let mut code_start = 0;
            for (i, line) in content.lines().enumerate() {
                if line.starts_with("Attribute VB_") {
                    code_start = i + 1;
                }
            }
            let code_lines: Vec<&str> = content.lines().collect();
            let code = if code_start < code_lines.len() {
                code_lines[code_start..].join("\r\n")
            } else {
                String::new()
            };

            let code_module = comp.get("CodeModule")?;
            let line_count = code_module.get_i32("CountOfLines").unwrap_or(0);
            if line_count > 0 {
                code_module.call_void(
                    "DeleteLines",
                    &mut [1i32.into(), line_count.into()],
                )?;
            }
            if !code.trim().is_empty() {
                code_module.call_void("AddFromString", &mut [variant_bstr(&code)])?;
            }
            return Ok(());
        }
    }

    // Non-document module: remove existing, import fresh.
    if let Some(comp) = existing {
        components.call_void("Remove", &mut [comp.into_variant()])?;
    }

    // Write a temp file encoded in the system's ANSI code page
    // (e.g. CP932 on Japanese Windows) — Excel's VBComponents.Import
    // expects this encoding.
    let ext = module_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("bas");
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("verde_import_{module_name}.{ext}"));

    let source_text = std::fs::read_to_string(module_path)
        .map_err(|e| VbaBridgeError::Other(format!("Failed to read module file: {e}")))?;
    let encoding = system_encoding();
    let (encoded, _, _) = encoding.encode(&source_text);
    std::fs::write(&temp_path, &*encoded)
        .map_err(|e| VbaBridgeError::Other(format!("Failed to write temp file: {e}")))?;

    let import_result =
        components.call_void("Import", &mut [variant_bstr(&temp_path.to_string_lossy())]);

    // Clean up temp file regardless of import result.
    let _ = std::fs::remove_file(&temp_path);

    import_result
}

pub struct VbaBridge;

impl VbaBridge {
    /// Export all VBA modules from a workbook to disk via COM.
    #[cfg(windows)]
    pub async fn export(
        xlsm_path: &str,
        output_dir: &str,
    ) -> Result<Vec<ExportedModule>, Box<dyn std::error::Error>> {
        let xlsm = xlsm_path.to_owned();
        let out_dir = output_dir.to_owned();

        let modules = run_on_sta_thread(COM_TIMEOUT, move || {
            let excel = create_instance("Excel.Application")?;
            excel.put_bool("Visible", false)?;
            excel.put_bool("DisplayAlerts", false)?;

            let workbooks = excel.get("Workbooks")?;
            let wb = workbooks.call_get("Open", &mut [variant_bstr(&xlsm)])?;

            let vbproject = vbproject_guard(&wb)?;
            let components = vbproject.get("VBComponents")?;
            let count = components.count()?;

            let mut modules = Vec::new();
            for i in 1..=count {
                let comp = components.item(i)?;
                let name = comp.get_string("Name")?;
                let type_code = comp.get_i32("Type")?;
                let ext = ext_for_type(type_code);
                let filename = format!("{name}{ext}");
                let filepath = Path::new(&out_dir).join(&filename);

                comp.call_void(
                    "Export",
                    &mut [variant_bstr(&filepath.to_string_lossy())],
                )?;

                modules.push(ExportedModule {
                    filename,
                    module_type: type_code as u32,
                });
            }

            wb.call_void("Close", &mut [false.into()])?;
            excel.call_void("Quit", &mut [])?;

            Ok(modules)
        })?;

        Ok(modules)
    }

    /// Import a single VBA module into a workbook via COM.
    #[cfg(windows)]
    pub async fn import(
        xlsm_path: &str,
        source_dir: &str,
        module_filename: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let xlsm = xlsm_path.to_owned();
        let module_path = Path::new(source_dir).join(module_filename).to_owned();
        let module_name = Path::new(module_filename)
            .file_stem()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        run_on_sta_thread(COM_TIMEOUT, move || {
            let session = excel_connect(&xlsm)?;
            let vbproject = vbproject_guard(&session.wb)?;
            let components = vbproject.get("VBComponents")?;

            let result = import_module_com(&components, &module_name, &module_path);

            if result.is_ok() {
                session.wb.call_void("Save", &mut []).ok();
            }

            excel_disconnect(session);
            result
        })?;

        Ok(())
    }

    /// Batch-import multiple modules in a single COM session.
    /// Opens the workbook once, imports all modules, saves once.
    #[cfg(windows)]
    pub async fn import_batch(
        xlsm_path: &str,
        source_dir: &str,
        module_filenames: &[&str],
    ) -> Result<(), Box<dyn std::error::Error>> {
        if module_filenames.is_empty() {
            return Ok(());
        }

        let xlsm = xlsm_path.to_owned();
        let src_dir = source_dir.to_owned();
        let filenames: Vec<String> = module_filenames.iter().map(|s| s.to_string()).collect();

        run_on_sta_thread(COM_TIMEOUT, move || {
            let session = excel_connect(&xlsm)?;
            let vbproject = vbproject_guard(&session.wb)?;
            let components = vbproject.get("VBComponents")?;

            for filename in &filenames {
                let module_name = Path::new(filename)
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let module_path = Path::new(&src_dir).join(filename);

                import_module_com(&components, &module_name, &module_path)?;
            }

            session.wb.call_void("Save", &mut []).ok();
            excel_disconnect(session);
            Ok(())
        })?;

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
    // Injection-flavored input now reaches the platform-not-supported
    // branch unchanged. With direct COM calls, there is even less
    // surface than the old env-var approach.

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
            "direct COM path has no injection surface, got: {msg}"
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
            "direct COM path has no injection surface, got: {msg}"
        );
        assert!(
            !msg.contains("PowerShell-sensitive"),
            "validator must be gone — injection is structurally impossible, got: {msg}"
        );
    }
}
