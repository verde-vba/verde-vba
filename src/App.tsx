import { useCallback, useState } from "react";
import { Editor } from "./components/Editor";
import { LockDialog } from "./components/LockDialog";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { TrustGuideDialog } from "./components/TrustGuideDialog";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { useTheme } from "./hooks/useTheme";
import { useVerdeProject } from "./hooks/useVerdeProject";
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
  const {
    project,
    activeModule,
    openProject,
    forceOpenProject,
    setActiveModule,
    saveModule,
  } = useVerdeProject();
  const [openModules, setOpenModules] = useState<ModuleInfo[]>([]);
  const [editorContent, setEditorContent] = useState("");
  const [lockPrompt, setLockPrompt] = useState<LockPrompt | null>(null);
  const [excelOpenPrompt, setExcelOpenPrompt] = useState<string | null>(null);
  // TODO: migrate this flag to settings.rs (Settings.vbaTrustAcknowledged)
  // once the backend exposes it. localStorage is the MVP shortcut so the
  // first-launch guide doesn't reappear across sessions.
  const [showTrust, setShowTrust] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.localStorage.getItem("verde:vbaTrustAcknowledged")
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

  const handleOpenReadOnly = useCallback(() => {
    // TODO: Implement read-only mode once backend supports opening a project
    // without acquiring the lock. For MVP, just dismiss the dialog.
    console.warn("Read-only open is not yet implemented");
    setLockPrompt(null);
  }, []);

  const handleLockCancel = useCallback(() => {
    setLockPrompt(null);
  }, []);

  const acknowledgeTrust = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("verde:vbaTrustAcknowledged", "1");
    }
    setShowTrust(false);
  }, []);

  const handleTrustClose = useCallback(() => {
    acknowledgeTrust();
  }, [acknowledgeTrust]);

  const handleTrustHowTo = useCallback(() => {
    // TODO: replace with our own docs URL once Verde docs site is live.
    window.open(
      "https://support.microsoft.com/en-us/office/enable-or-disable-macros-in-microsoft-365-files-12b036fd-d140-4e74-b45e-16fed1a7e5c6",
      "_blank"
    );
    acknowledgeTrust();
  }, [acknowledgeTrust]);

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
      } catch (e) {
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
    [activeModule, saveModule]
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
        status={project ? "ready" : "ready"}
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

      {showTrust && (
        <TrustGuideDialog
          onClose={handleTrustClose}
          onHowTo={handleTrustHowTo}
        />
      )}
    </div>
  );
}

export default App;
