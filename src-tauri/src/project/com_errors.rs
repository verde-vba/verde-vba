//! COM / VBA bridge error classification.
//!
//! With the windows-rs COM bridge, import/export failures carry their
//! classification directly as `VbaBridgeError` variants — no locale or
//! string parsing required. This module lifts that decoding into a
//! standalone unit so the rest of `project` can treat it as a pure
//! black box and the markers/HRESULT table stay greppable in one place.

use crate::com_dispatch::VbaBridgeError;

/// Locale-agnostic classification of a COM HRESULT.
///
/// The variants intentionally cover only the kinds Verde currently branches
/// on. Anything unrecognised goes into `Unknown(i32)` so diagnostics can
/// still surface the raw value without pretending to classify it.
#[derive(Debug, PartialEq, Eq)]
pub(crate) enum ErrorKind {
    ExcelOpen,
    // `#[allow(dead_code)]` is temporary — PermissionDenied / NotFound /
    // Unknown are exercised by pure classify_hresult tests but not yet
    // branched on in production code. They'll come off the allowlist once
    // the UI grows branches for them (planned follow-up, not Sprint 25).
    #[allow(dead_code)]
    PermissionDenied,
    #[allow(dead_code)]
    NotFound,
    #[allow(dead_code)]
    Unknown(i32),
}

/// HRESULT values that all indicate "another process (Excel) holds the
/// file open". Grouped here rather than inline in `classify_hresult` so
/// a future locale- or API-driven addition (e.g. an OLE-specific variant)
/// has a single, greppable home.
///
/// - `0x80070020` `ERROR_SHARING_VIOLATION` — file shared for delete/write
/// - `0x80070021` `ERROR_LOCK_VIOLATION` — byte-range lock conflict
pub(crate) const EXCEL_OPEN_HRESULTS: &[i32] =
    &[0x80070020u32 as i32, 0x80070021u32 as i32];

/// Marker embedded in error messages when Excel is holding the workbook open
/// (file locked, COM cannot save). The frontend can match on this prefix to
/// surface a "close Excel first" dialog (PLANS §9 step 4).
pub const EXCEL_OPEN_MARKER: &str = "EXCEL_OPEN";

/// Marker embedded in error messages when `$wb.VBProject` is inaccessible
/// because the Excel Trust Center setting "Trust access to the VBA project
/// object model" is disabled. The frontend matches on this prefix to
/// re-surface the TrustGuideDialog.
pub const TRUST_ACCESS_MARKER: &str = "TRUST_ACCESS";

/// Map a HRESULT integer to Verde's classification enum.
///
/// Pure function — no locale, no I/O. Used by `classify_com_error`
/// to branch on the HRESULT carried by `VbaBridgeError::Com(hr)`.
pub(crate) fn classify_hresult(hresult: i32) -> ErrorKind {
    if EXCEL_OPEN_HRESULTS.contains(&hresult) {
        ErrorKind::ExcelOpen
    } else if hresult == 0x80070005u32 as i32 {
        ErrorKind::PermissionDenied
    } else if hresult == 0x80030002u32 as i32 {
        ErrorKind::NotFound
    } else {
        ErrorKind::Unknown(hresult)
    }
}

/// Classify an import/export failure using structural error types.
///
/// The most specific markers are checked first (workbook-null,
/// trust-denied), then HRESULT-based Excel-open detection.
/// Non-matching errors pass through unchanged.
pub(crate) fn classify_com_error(
    err: Box<dyn std::error::Error>,
) -> Box<dyn std::error::Error> {
    if let Some(bridge_err) = err.downcast_ref::<VbaBridgeError>() {
        match bridge_err {
            VbaBridgeError::WorkbookNull => {
                return format!(
                    "{}: Workbook could not be opened. Excel may have the file locked or the path could not be resolved.",
                    EXCEL_OPEN_MARKER
                )
                .into();
            }
            VbaBridgeError::TrustDenied => {
                return format!(
                    "{}: VBProject is not accessible. Enable 'Trust access to the VBA project object model' in Excel settings.",
                    TRUST_ACCESS_MARKER
                )
                .into();
            }
            VbaBridgeError::Com(hr) if classify_hresult(*hr) == ErrorKind::ExcelOpen => {
                return format!(
                    "{}: Excel appears to have the workbook open. Close it and retry. (HRESULT 0x{:08X})",
                    EXCEL_OPEN_MARKER, hr
                )
                .into();
            }
            _ => {}
        }
    }
    err
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- classify_hresult (pure) ---

    #[test]
    fn classify_hresult_maps_sharing_violation_to_excel_open() {
        // ERROR_SHARING_VIOLATION — canonical "another process has the file
        // open for delete/write", which is exactly the Excel case.
        let kind = classify_hresult(0x80070020u32 as i32);
        assert_eq!(kind, ErrorKind::ExcelOpen);
    }

    #[test]
    fn classify_hresult_maps_lock_violation_to_excel_open() {
        // ERROR_LOCK_VIOLATION — secondary Excel-holding-file signal. Pinned
        // so a future refactor cannot accidentally drop it without tripping
        // this test.
        let kind = classify_hresult(0x80070021u32 as i32);
        assert_eq!(kind, ErrorKind::ExcelOpen);
    }

    #[test]
    fn classify_hresult_maps_access_denied_to_permission_denied() {
        // E_ACCESSDENIED — not Excel; a permissions problem. Classifying it
        // separately means the UI can route it to a different dialog later.
        let kind = classify_hresult(0x80070005u32 as i32);
        assert_eq!(kind, ErrorKind::PermissionDenied);
    }

    #[test]
    fn classify_hresult_leaves_unrecognised_codes_in_unknown_bucket() {
        // XlNamedRange (Excel-specific) — not one we branch on. Must fall
        // through to Unknown with the raw i32 preserved for diagnostics.
        let raw = 0x800A03ECu32 as i32;
        assert_eq!(classify_hresult(raw), ErrorKind::Unknown(raw));
    }

    // --- classify_com_error with VbaBridgeError ---

    #[test]
    fn classify_com_error_maps_workbook_null_to_excel_open_marker() {
        let err: Box<dyn std::error::Error> = VbaBridgeError::WorkbookNull.into();
        let classified = classify_com_error(err);
        let msg = classified.to_string();
        assert!(
            msg.starts_with(EXCEL_OPEN_MARKER),
            "WorkbookNull should map to EXCEL_OPEN marker, got: {msg}"
        );
    }

    #[test]
    fn classify_com_error_maps_trust_denied_to_trust_access_marker() {
        let err: Box<dyn std::error::Error> = VbaBridgeError::TrustDenied.into();
        let classified = classify_com_error(err);
        let msg = classified.to_string();
        assert!(
            msg.starts_with(TRUST_ACCESS_MARKER),
            "TrustDenied should map to TRUST_ACCESS marker, got: {msg}"
        );
    }

    #[test]
    fn classify_com_error_maps_sharing_violation_hresult_to_excel_open_marker() {
        let err: Box<dyn std::error::Error> =
            VbaBridgeError::Com(0x80070020u32 as i32).into();
        let classified = classify_com_error(err);
        let msg = classified.to_string();
        assert!(
            msg.starts_with(EXCEL_OPEN_MARKER),
            "HRESULT 0x80070020 should map to EXCEL_OPEN marker, got: {msg}"
        );
    }

    #[test]
    fn classify_com_error_passes_through_unrecognised_hresult() {
        let hr = 0x800A03ECu32 as i32;
        let err: Box<dyn std::error::Error> = VbaBridgeError::Com(hr).into();
        let classified = classify_com_error(err);
        let msg = classified.to_string();
        assert!(
            !msg.starts_with(EXCEL_OPEN_MARKER) && !msg.starts_with(TRUST_ACCESS_MARKER),
            "Unrecognised HRESULT should pass through unchanged, got: {msg}"
        );
    }

    #[test]
    fn classify_com_error_passes_through_non_bridge_errors() {
        let err: Box<dyn std::error::Error> = "some other error".into();
        let classified = classify_com_error(err);
        let msg = classified.to_string();
        assert_eq!(msg, "some other error");
    }
}
