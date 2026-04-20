import { useCallback, useState } from "react";
import { Editor } from "./components/Editor";
import { LockDialog } from "./components/LockDialog";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
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
    (content: string) => {
      if (activeModule) {
        saveModule(activeModule.filename, content);
      }
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
    </div>
  );
}

export default App;
