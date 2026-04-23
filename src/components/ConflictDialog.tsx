import { DiffEditor } from "@monaco-editor/react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchConflictContents } from "../lib/tauri-commands";
import type { ConflictContent, ConflictModule } from "../lib/types";

interface ConflictDialogProps {
  projectId: string;
  xlsmPath: string;
  count: number;
  modules?: ConflictModule[];
  resolving?: boolean;
  error?: string | null;
  theme: "light" | "dark";
  /** Legacy all-or-nothing resolve — kept for backward compat. */
  onKeepFile: () => void;
  onKeepExcel: () => void;
  /** Per-module resolve — the new path. */
  onResolvePerModule?: (decisions: Record<string, "verde" | "excel">) => void;
}

export function ConflictDialog({
  projectId,
  xlsmPath,
  count,
  modules,
  resolving,
  error,
  theme,
  onKeepFile,
  onKeepExcel,
  onResolvePerModule,
}: ConflictDialogProps) {
  const { t } = useTranslation();

  // Per-module decision state: filename → "verde" | "excel"
  const [decisions, setDecisions] = useState<Record<string, "verde" | "excel">>({});

  // Which module is currently shown in the diff viewer (null = none)
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Cached diff content from backend
  const [diffContents, setDiffContents] = useState<Record<string, ConflictContent>>({});
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  // Initialize decisions: default all to "excel" (safer — preserves what's in the workbook)
  useEffect(() => {
    if (!modules) return;
    const initial: Record<string, "verde" | "excel"> = {};
    for (const m of modules) {
      initial[m.filename] = "excel";
    }
    setDecisions(initial);
  }, [modules]);

  const handleDecisionChange = useCallback(
    (filename: string, side: "verde" | "excel") => {
      setDecisions((prev) => ({ ...prev, [filename]: side }));
    },
    []
  );

  // Fetch diff contents when a module is selected for the first time
  const handleModuleClick = useCallback(
    async (filename: string) => {
      // Toggle: clicking the same module again collapses the diff
      if (selectedModule === filename) {
        setSelectedModule(null);
        return;
      }
      setSelectedModule(filename);

      // Already cached?
      if (diffContents[filename]) return;

      setDiffLoading(true);
      setDiffError(null);
      try {
        const results = await fetchConflictContents(projectId, xlsmPath, [filename]);
        if (results.length > 0) {
          setDiffContents((prev) => ({
            ...prev,
            [results[0].filename]: results[0],
          }));
        }
      } catch (e) {
        setDiffError(e instanceof Error ? e.message : String(e));
      } finally {
        setDiffLoading(false);
      }
    },
    [selectedModule, diffContents, projectId, xlsmPath]
  );

  const handleResolve = useCallback(() => {
    if (onResolvePerModule) {
      onResolvePerModule(decisions);
    }
  }, [onResolvePerModule, decisions]);

  // Check if all modules have the same decision — enables legacy shortcut buttons
  const allVerde = modules?.every((m) => decisions[m.filename] === "verde") ?? false;
  const allExcel = modules?.every((m) => decisions[m.filename] === "excel") ?? false;

  const currentDiff = selectedModule ? diffContents[selectedModule] : null;
  const hasDiffViewer = selectedModule != null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        style={{
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "20px 24px",
          minWidth: "480px",
          maxWidth: hasDiffViewer ? "90vw" : "560px",
          width: hasDiffViewer ? "90vw" : undefined,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
          transition: "max-width 0.2s, width 0.2s",
        }}
      >
        {/* Header */}
        <h2
          id="conflict-dialog-title"
          style={{
            margin: "0 0 12px 0",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--error)",
          }}
        >
          {t("conflict.title")}
        </h2>

        <p
          style={{
            margin: "0 0 12px 0",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          {t("conflict.message", { count })}
        </p>

        {/* Main content area */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Left panel: module list with radio buttons */}
          <div
            style={{
              minWidth: "260px",
              maxWidth: hasDiffViewer ? "300px" : "100%",
              flex: hasDiffViewer ? "0 0 260px" : "1",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Column headers */}
            {modules && modules.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "4px 8px",
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ flex: 1 }}>Module</span>
                <span style={{ width: "56px", textAlign: "center" }}>{t("conflict.verde")}</span>
                <span style={{ width: "56px", textAlign: "center" }}>{t("conflict.excel")}</span>
              </div>
            )}

            {/* Module rows */}
            <div
              style={{
                maxHeight: hasDiffViewer ? "50vh" : "180px",
                overflowY: "auto",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: "0 0 4px 4px",
              }}
            >
              {modules?.map((m) => (
                <div
                  key={m.filename}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderBottom: "1px solid var(--border)",
                    background:
                      selectedModule === m.filename
                        ? "var(--bg-active, rgba(0,120,212,0.1))"
                        : "transparent",
                    cursor: "pointer",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleModuleClick(m.filename)}
                    style={{
                      flex: 1,
                      background: "none",
                      border: "none",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                      fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      padding: 0,
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: selectedModule === m.filename ? 600 : 400,
                    }}
                  >
                    {m.filename}
                  </button>
                  <label
                    style={{
                      width: "56px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <input
                      type="radio"
                      name={`conflict-${m.filename}`}
                      checked={decisions[m.filename] === "verde"}
                      onChange={() => handleDecisionChange(m.filename, "verde")}
                      disabled={resolving}
                    />
                  </label>
                  <label
                    style={{
                      width: "56px",
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <input
                      type="radio"
                      name={`conflict-${m.filename}`}
                      checked={decisions[m.filename] === "excel"}
                      onChange={() => handleDecisionChange(m.filename, "excel")}
                      disabled={resolving}
                    />
                  </label>
                </div>
              ))}
            </div>

            {/* Quick-select all buttons */}
            {modules && modules.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "8px",
                  fontSize: "11px",
                }}
              >
                <button
                  type="button"
                  disabled={resolving || allVerde}
                  onClick={() => {
                    const all: Record<string, "verde" | "excel"> = {};
                    for (const m of modules) all[m.filename] = "verde";
                    setDecisions(all);
                  }}
                  style={{
                    flex: 1,
                    padding: "3px 8px",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    cursor: resolving || allVerde ? "default" : "pointer",
                    opacity: resolving || allVerde ? 0.5 : 1,
                  }}
                >
                  {t("conflict.keepFile")}
                </button>
                <button
                  type="button"
                  disabled={resolving || allExcel}
                  onClick={() => {
                    const all: Record<string, "verde" | "excel"> = {};
                    for (const m of modules) all[m.filename] = "excel";
                    setDecisions(all);
                  }}
                  style={{
                    flex: 1,
                    padding: "3px 8px",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "3px",
                    cursor: resolving || allExcel ? "default" : "pointer",
                    opacity: resolving || allExcel ? 0.5 : 1,
                  }}
                >
                  {t("conflict.keepExcel")}
                </button>
              </div>
            )}
          </div>

          {/* Right panel: Monaco DiffEditor */}
          {hasDiffViewer && (
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              {/* Diff header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  borderBottom: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                }}
              >
                <span>{t("conflict.excel")} (original)</span>
                <span>{selectedModule}</span>
                <span>{t("conflict.verde")} (modified)</span>
              </div>

              {/* Diff content */}
              <div style={{ flex: 1, minHeight: "300px" }}>
                {diffLoading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "var(--text-secondary)",
                      fontSize: "13px",
                    }}
                  >
                    {t("conflict.loadingDiff")}
                  </div>
                ) : diffError ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      color: "var(--error)",
                      fontSize: "13px",
                    }}
                  >
                    {t("conflict.diffError")}
                  </div>
                ) : currentDiff ? (
                  <DiffEditor
                    original={currentDiff.excelContent}
                    modified={currentDiff.verdeContent}
                    language="vba"
                    theme={theme === "dark" ? "vs-dark" : "vs"}
                    options={{
                      readOnly: true,
                      renderSideBySide: true,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      fontSize: 12,
                      lineNumbers: "on",
                    }}
                  />
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            style={{
              margin: "12px 0 0 0",
              padding: "8px 12px",
              fontSize: "12px",
              lineHeight: 1.5,
              color: "var(--error)",
              background: "var(--bg-secondary)",
              border: "1px solid var(--error)",
              borderRadius: "4px",
            }}
          >
            {error}
          </p>
        )}

        {/* Footer actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
            marginTop: "16px",
          }}
        >
          {onResolvePerModule ? (
            <button
              type="button"
              onClick={handleResolve}
              disabled={resolving || !modules?.length}
              style={{
                padding: "6px 20px",
                background: "var(--accent)",
                color: "#ffffff",
                border: "1px solid var(--accent)",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: resolving ? "wait" : "pointer",
                opacity: resolving ? 0.5 : 1,
              }}
            >
              {t("conflict.resolve")}
            </button>
          ) : (
            // Fallback: legacy two-button mode
            <>
              <button
                type="button"
                onClick={onKeepExcel}
                disabled={resolving}
                style={{
                  padding: "6px 14px",
                  background: "transparent",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  fontSize: "13px",
                  cursor: resolving ? "wait" : "pointer",
                  opacity: resolving ? 0.5 : 1,
                }}
              >
                {t("conflict.keepExcel")}
              </button>
              <button
                type="button"
                onClick={onKeepFile}
                disabled={resolving}
                style={{
                  padding: "6px 14px",
                  background: "var(--accent)",
                  color: "#ffffff",
                  border: "1px solid var(--accent)",
                  borderRadius: "4px",
                  fontSize: "13px",
                  cursor: resolving ? "wait" : "pointer",
                  opacity: resolving ? 0.5 : 1,
                }}
              >
                {t("conflict.keepFile")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
