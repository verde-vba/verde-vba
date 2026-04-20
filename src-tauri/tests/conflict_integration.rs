//! Black-box integration tests for `detect_conflicts`.
//!
//! These tests live outside the crate so they exercise only the public API
//! (`verde_lib::conflict`). They intentionally duplicate some scenarios from
//! the in-module unit tests so the wire contract is pinned even if the
//! internals are refactored.
//!
//! Out of scope: the `project::check_conflict` orchestrator, which depends
//! on `VbaBridge::export` (PowerShell / COM — Windows only).

use std::collections::HashMap;

use verde_lib::conflict::{detect_conflicts, ConflictModule};

fn hm(pairs: &[(&str, &str)]) -> HashMap<String, String> {
    pairs
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_string()))
        .collect()
}

/// Scenario 1: all three sources agree on every module hash.
#[test]
fn returns_empty_when_all_three_sources_agree() {
    let file = hm(&[("Module1.bas", "hash_abc"), ("Class1.cls", "hash_def")]);
    let meta = hm(&[("Module1.bas", "hash_abc"), ("Class1.cls", "hash_def")]);
    let excel = hm(&[("Module1.bas", "hash_abc"), ("Class1.cls", "hash_def")]);

    let got = detect_conflicts(&file, &meta, &excel);

    assert!(got.is_empty(), "expected no conflicts, got {got:?}",);
}

/// Scenario 2: Excel-side drift for one module.
///
/// File and meta agree (nothing edited locally since last sync), but Excel
/// returns a different hash — classic "user edited VBA in Excel and closed
/// without syncing out" case.
#[test]
fn surfaces_single_module_when_only_excel_hash_differs() {
    let file = hm(&[("Module1.bas", "file_hash"), ("Module2.bas", "same")]);
    let meta = hm(&[("Module1.bas", "file_hash"), ("Module2.bas", "same")]);
    let excel = hm(&[("Module1.bas", "excel_drift"), ("Module2.bas", "same")]);

    let got = detect_conflicts(&file, &meta, &excel);

    assert_eq!(got.len(), 1, "expected exactly one conflict, got {got:?}");
    let conflict = &got[0];
    assert_eq!(conflict.filename, "Module1.bas");
    assert_eq!(conflict.file_hash, "file_hash");
    assert_eq!(conflict.meta_hash, "file_hash");
    assert_eq!(conflict.excel_hash, "excel_drift");
}

/// Scenario 3: module deleted on Excel side but still tracked in file + meta.
///
/// We model "missing" as an empty-string hash so the UI can tell the user
/// which side is absent instead of silently dropping the module.
#[test]
fn surfaces_deletion_on_excel_side_with_empty_excel_hash() {
    let file = hm(&[("Removed.bas", "hash_xyz")]);
    let meta = hm(&[("Removed.bas", "hash_xyz")]);
    let excel: HashMap<String, String> = HashMap::new();

    let got = detect_conflicts(&file, &meta, &excel);

    assert_eq!(got.len(), 1, "expected one conflict, got {got:?}");
    let conflict = &got[0];
    assert_eq!(conflict.filename, "Removed.bas");
    assert_eq!(conflict.file_hash, "hash_xyz");
    assert_eq!(conflict.meta_hash, "hash_xyz");
    assert_eq!(
        conflict.excel_hash, "",
        "missing-in-excel must surface as empty string, not be dropped",
    );
}

/// Scenario 4: output order is stable (alphabetical by filename) regardless
/// of insertion order. HashMap iteration is non-deterministic, so the sort
/// must be done inside `detect_conflicts` — this pins that invariant.
#[test]
fn output_is_sorted_alphabetically_regardless_of_insertion_order() {
    // Insert in deliberately non-alphabetical order.
    let mut file = HashMap::new();
    file.insert("Zeta.bas".to_string(), "a".to_string());
    file.insert("Alpha.bas".to_string(), "a".to_string());
    file.insert("Middle.cls".to_string(), "a".to_string());

    let mut meta = HashMap::new();
    meta.insert("Middle.cls".to_string(), "b".to_string());
    meta.insert("Zeta.bas".to_string(), "b".to_string());
    meta.insert("Alpha.bas".to_string(), "b".to_string());

    let mut excel = HashMap::new();
    excel.insert("Alpha.bas".to_string(), "c".to_string());
    excel.insert("Middle.cls".to_string(), "c".to_string());
    excel.insert("Zeta.bas".to_string(), "c".to_string());

    let got = detect_conflicts(&file, &meta, &excel);

    let names: Vec<&str> = got.iter().map(|m| m.filename.as_str()).collect();
    assert_eq!(
        names,
        vec!["Alpha.bas", "Middle.cls", "Zeta.bas"],
        "conflicts must be sorted by filename",
    );
}

/// Bonus: the full `ConflictModule` struct round-trips through the public
/// API exactly as constructed — guards against silent field renames.
#[test]
fn conflict_module_public_struct_exposes_expected_fields() {
    let file = hm(&[("A.bas", "f")]);
    let meta = hm(&[("A.bas", "m")]);
    let excel = hm(&[("A.bas", "e")]);

    let got = detect_conflicts(&file, &meta, &excel);

    assert_eq!(
        got,
        vec![ConflictModule {
            filename: "A.bas".to_string(),
            file_hash: "f".to_string(),
            meta_hash: "m".to_string(),
            excel_hash: "e".to_string(),
        }],
    );
}
