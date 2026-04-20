use std::collections::{BTreeSet, HashMap};

use serde::Serialize;

/// A module whose hash disagrees across at least two of the three sources
/// (AppData file / `.verde-meta.json` / live Excel export). The UI surfaces
/// all three hashes so the user can reason about which side they trust.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ConflictModule {
    pub filename: String,
    pub file_hash: String,
    pub meta_hash: String,
    pub excel_hash: String,
}

/// Wire DTO for `ConflictModule` with camelCase fields matching the frozen
/// frontend contract (`src/lib/tauri-commands.ts`).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictModuleDto {
    pub filename: String,
    pub file_hash: String,
    pub meta_hash: String,
    pub excel_hash: String,
}

impl From<ConflictModule> for ConflictModuleDto {
    fn from(m: ConflictModule) -> Self {
        Self {
            filename: m.filename,
            file_hash: m.file_hash,
            meta_hash: m.meta_hash,
            excel_hash: m.excel_hash,
        }
    }
}

/// Compare per-module hashes across AppData files, `.verde-meta.json`, and a
/// fresh Excel export. Returns the set of modules whose hashes disagree.
///
/// "Missing in one source" is modelled as an empty-string hash for that
/// source — this keeps the function total and lets the UI tell the user
/// which side is absent rather than silently dropping the module. A module
/// missing from every source cannot be enumerated here (we wouldn't see it)
/// so the caller must collect keys from the union up-front.
///
/// The output is sorted by filename for deterministic ordering in tests and
/// in the UI.
pub fn detect_conflicts(
    file_hashes: &HashMap<String, String>,
    meta_hashes: &HashMap<String, String>,
    excel_hashes: &HashMap<String, String>,
) -> Vec<ConflictModule> {
    let mut names: BTreeSet<&str> = BTreeSet::new();
    names.extend(file_hashes.keys().map(String::as_str));
    names.extend(meta_hashes.keys().map(String::as_str));
    names.extend(excel_hashes.keys().map(String::as_str));

    let mut conflicts = Vec::new();
    for name in names {
        let file = file_hashes.get(name).cloned().unwrap_or_default();
        let meta = meta_hashes.get(name).cloned().unwrap_or_default();
        let excel = excel_hashes.get(name).cloned().unwrap_or_default();

        // Hashes agree only when all three match. With empty-string standing
        // in for "missing", a module that is absent from one source but
        // present in another will compare unequal and correctly surface.
        if file != meta || meta != excel {
            conflicts.push(ConflictModule {
                filename: name.to_string(),
                file_hash: file,
                meta_hash: meta,
                excel_hash: excel,
            });
        }
    }
    conflicts
}

#[cfg(test)]
mod tests {
    use super::*;

    fn hm(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn no_conflict_when_all_three_sources_match() {
        let f = hm(&[("A.bas", "h1"), ("B.cls", "h2")]);
        let m = hm(&[("A.bas", "h1"), ("B.cls", "h2")]);
        let e = hm(&[("A.bas", "h1"), ("B.cls", "h2")]);
        assert!(detect_conflicts(&f, &m, &e).is_empty());
    }

    #[test]
    fn file_and_meta_differ_excel_matches_meta_is_a_conflict() {
        let f = hm(&[("A.bas", "local")]);
        let m = hm(&[("A.bas", "h1")]);
        let e = hm(&[("A.bas", "h1")]);
        let got = detect_conflicts(&f, &m, &e);
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].filename, "A.bas");
        assert_eq!(got[0].file_hash, "local");
        assert_eq!(got[0].meta_hash, "h1");
        assert_eq!(got[0].excel_hash, "h1");
    }

    #[test]
    fn all_three_differ_emits_all_three_hashes() {
        let f = hm(&[("A.bas", "a")]);
        let m = hm(&[("A.bas", "b")]);
        let e = hm(&[("A.bas", "c")]);
        let got = detect_conflicts(&f, &m, &e);
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].file_hash, "a");
        assert_eq!(got[0].meta_hash, "b");
        assert_eq!(got[0].excel_hash, "c");
    }

    #[test]
    fn module_missing_from_excel_is_a_conflict_with_empty_excel_hash() {
        let f = hm(&[("A.bas", "h1")]);
        let m = hm(&[("A.bas", "h1")]);
        let e = hm(&[]);
        let got = detect_conflicts(&f, &m, &e);
        assert_eq!(got.len(), 1);
        assert_eq!(got[0].filename, "A.bas");
        assert_eq!(got[0].excel_hash, "");
    }

    #[test]
    fn output_is_sorted_by_filename() {
        let f = hm(&[("Z.bas", "a"), ("A.bas", "a")]);
        let m = hm(&[("Z.bas", "b"), ("A.bas", "b")]);
        let e = hm(&[("Z.bas", "c"), ("A.bas", "c")]);
        let got = detect_conflicts(&f, &m, &e);
        assert_eq!(got.len(), 2);
        assert_eq!(got[0].filename, "A.bas");
        assert_eq!(got[1].filename, "Z.bas");
    }

    #[test]
    fn dto_converts_from_conflict_module() {
        let m = ConflictModule {
            filename: "A.bas".into(),
            file_hash: "f".into(),
            meta_hash: "m".into(),
            excel_hash: "e".into(),
        };
        let dto: ConflictModuleDto = m.into();
        assert_eq!(dto.filename, "A.bas");
        assert_eq!(dto.file_hash, "f");
        assert_eq!(dto.meta_hash, "m");
        assert_eq!(dto.excel_hash, "e");
    }

    #[test]
    fn dto_serializes_as_camel_case() {
        let dto = ConflictModuleDto {
            filename: "A.bas".into(),
            file_hash: "f".into(),
            meta_hash: "m".into(),
            excel_hash: "e".into(),
        };
        let json = serde_json::to_string(&dto).unwrap();
        assert!(json.contains("\"fileHash\":\"f\""));
        assert!(json.contains("\"metaHash\":\"m\""));
        assert!(json.contains("\"excelHash\":\"e\""));
    }
}
