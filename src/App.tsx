import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConflictDialog } from "./components/ConflictDialog";
import { Editor } from "./components/Editor";
import { LockDialog } from "./components/LockDialog";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { TrustGuideDialog } from "./components/TrustGuideDialog";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { useTheme } from "./hooks/useTheme";
import { useTrust } from "./hooks/useTrust";
import { SAVE_BLOCKED_READONLY, useVerdeProject } from "./hooks/useVerdeProject";
import { parseBackendError } from "./lib/error-parse";
import type { ModuleInfo } from "./lib/types";

interface LockPrompt {
  xlsmPath: string;
  user: string;
  machine: string;
  time: string;
}

function App() {
  const { resolved } = useTheme("system");
  const { t } = useTranslation();
  const {
    project,
    activeModule,
    readOnly,
    conflict,
    openProject,
    forceOpenProject,
    openProjectReadOnly,
    setActiveModule,
    saveModule,
    resolveConflict,
  } = useVerdeProject();
  const { acknowledged: trustAcknowledged, acknowledge: acknowledgeTrust } =
    useTrust();
  const [openModules, setOpenModules] = useState<ModuleInfo[]>([]);
  const [editorContent, setEditorContent] = useState("");
  const [lockPrompt, setLockPrompt] = useState<LockPrompt | null>(null);
  const [excelOpenPrompt, setExcelOpenPrompt] = useState<string | null>(null);
  const [saveBlockedPrompt, setSaveBlockedPrompt] = useState<string | null>(
    null
  );

  const handleOpenFile = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        filters: [{ name: "Excel Macro", extensions: ["xlsm"] }],
      });
      if (!path) return;
      const xlsmPath = path as string;
      try {
        await openProject(xlsmPath);
      } catch (e) {
        const parsed = parseBackendError(e);
        if (parsed.kind === "locked") {
          setLockPrompt({
            xlsmPath,
            user: parsed.user,
            machine: parsed.machine,
            time: parsed.time,
          });
        } else {
          console.error("Failed to open project:", parsed);
        }
      }
    } catch {
      // Dev mode fallback (plugin-dialog only available inside Tauri runtime)
      console.log("File dialog not available outside Tauri");
    }
  }, [openProject]);

  const handleForceOpen = useCallback(async () => {
    if (!lockPrompt) return;
    const { xlsmPath } = lockPrompt;
    setLockPrompt(null);
    try {
      await forceOpenProject(xlsmPath);
    } catch (e) {
      console.error("Force open failed:", parseBackendError(e));
    }
  }, [lockPrompt, forceOpenProject]);

  const handleOpenReadOnly = useCallback(async () => {
    if (!lockPrompt) return;
    const { xlsmPath } = lockPrompt;
    setLockPrompt(null);
    try {
      await openProjectReadOnly(xlsmPath);
    } catch (e) {
      console.error("Read-only open failed:", parseBackendError(e));
    }
  }, [lockPrompt, openProjectReadOnly]);

  const handleLockCancel = useCallback(() => {
    setLockPrompt(null);
  }, []);

  const handleTrustClose = useCallback(() => {
    void acknowledgeTrust();
  }, [acknowledgeTrust]);

  const handleTrustHowTo = useCallback(() => {
    // TODO: replace with our own docs URL once Verde docs site is live.
    window.open(
      "https://support.microsoft.com/en-us/office/enable-or-disable-macros-in-microsoft-365-files-12b036fd-d140-4e74-b45e-16fed1a7e5c6",
      "_blank"
    );
    void acknowledgeTrust();
  }, [acknowledgeTrust]);

  const handleKeepFile = useCallback(() => {
    void resolveConflict("verde");
  }, [resolveConflict]);

  const handleKeepExcel = useCallback(() => {
    void resolveConflict("excel");
  }, [resolveConflict]);

  const handleSelectModule = useCallback(
    (mod: ModuleInfo) => {
      setActiveModule(mod);
      if (!openModules.find((m) => m.filename === mod.filename)) {
        setOpenModules((prev) => [...prev, mod]);
      }
    },
    [openModules, setActiveModule]
  );

  const handleCloseModule = useCallback(
    (mod: ModuleInfo) => {
      setOpenModules((prev) => prev.filter((m) => m.filename !== mod.filename));
      if (activeModule?.filename === mod.filename) {
        const remaining = openModules.filter(
          (m) => m.filename !== mod.filename
        );
        setActiveModule(remaining[remaining.length - 1] ?? null!);
      }
    },
    [activeModule, openModules, setActiveModule]
  );

  const handleSave = useCallback(
    async (content: string) => {
      if (!activeModule) return;
      try {
        await saveModule(activeModule.filename, content);
        setExcelOpenPrompt(null);
        setSaveBlockedPrompt(null);
      } catch (e) {
        // Read-only saves short-circuit in the hook with a sentinel
        // message — translate it here rather than leaking the constant
        // into the render tree.
        if (e instanceof Error && e.message === SAVE_BLOCKED_READONLY) {
          setSaveBlockedPrompt(t("status.saveBlocked"));
          return;
        }
        const parsed = parseBackendError(e);
        if (parsed.kind === "excelOpen") {
          setExcelOpenPrompt(parsed.detail);
        } else {
          console.error("Save failed:", parsed);
        }
      }
      // TODO: wire ConflictDialog here once the backend reports
      // file-vs-Excel content conflicts (different from EXCEL_OPEN, which
      // is a save-time lock condition rather than a content conflict).
    },
    [activeModule, saveModule, t]
  );

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {project && (
          <Sidebar
            modules={project.modules}
            activeModule={activeModule}
            onSelectModule={handleSelectModule}
          />
        )}

        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          {project ? (
            <>
              {readOnly && (
                <div
                  role="status"
                  style={{
                    padding: "4px 12px",
                    background: "var(--warning-bg, #fff4e5)",
                    color: "var(--warning-text, #7a4b00)",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                >
                  {t("status.readOnly")}
                </div>
              )}
              <TabBar
                openModules={openModules}
                activeModule={activeModule}
                onSelectModule={handleSelectModule}
                onCloseModule={handleCloseModule}
              />
              {activeModule ? (
                <Editor
                  filename={activeModule.filename}
                  content={editorContent}
                  theme={resolved}
                  onSave={handleSave}
                  onChange={setEditorContent}
                />
              ) : (
                <WelcomeScreen onOpenFile={handleOpenFile} />
              )}
            </>
          ) : (
            <WelcomeScreen onOpenFile={handleOpenFile} />
          )}
        </div>
      </div>

      {saveBlockedPrompt && (
        <div
          role="alert"
          style={{
            padding: "8px 12px",
            background: "var(--bg-secondary, #fff4e5)",
            color: "var(--text-primary)",
            borderTop: "1px solid var(--border)",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>{saveBlockedPrompt}</span>
          <button
            type="button"
            onClick={() => setSaveBlockedPrompt(null)}
            style={{
              padding: "2px 10px",
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {excelOpenPrompt && (
        <div
          role="alert"
          style={{
            padding: "8px 12px",
            background: "var(--bg-secondary, #fff4e5)",
            color: "var(--text-primary)",
            borderTop: "1px solid var(--border)",
            fontSize: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span>
            Cannot save while Excel has the workbook open.
            {excelOpenPrompt ? ` (${excelOpenPrompt})` : ""}
          </span>
          <button
            type="button"
            onClick={() => setExcelOpenPrompt(null)}
            style={{
              padding: "2px 10px",
              background: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <StatusBar
        status="ready"
        projectId={project?.project_id}
      />

      {lockPrompt && (
        <LockDialog
          lock={{
            user: lockPrompt.user,
            machine: lockPrompt.machine,
            time: lockPrompt.time,
          }}
          onForceOpen={handleForceOpen}
          onOpenReadOnly={handleOpenReadOnly}
          onCancel={handleLockCancel}
        />
      )}

      {trustAcknowledged === false && (
        <TrustGuideDialog
          onClose={handleTrustClose}
          onHowTo={handleTrustHowTo}
        />
      )}

      {conflict != null && (
        <ConflictDialog
          count={conflict.modules.length}
          onKeepFile={handleKeepFile}
          onKeepExcel={handleKeepExcel}
        />
      )}
    </div>
  );
}

export default App;
