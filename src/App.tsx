import { useCallback, useState } from "react";
import { Editor } from "./components/Editor";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { useTheme } from "./hooks/useTheme";
import { useVerdeProject } from "./hooks/useVerdeProject";
import type { ModuleInfo } from "./lib/types";

function App() {
  const { resolved } = useTheme("system");
  const {
    project,
    activeModule,
    openProject,
    setActiveModule,
    saveModule,
  } = useVerdeProject();
  const [openModules, setOpenModules] = useState<ModuleInfo[]>([]);
  const [editorContent, setEditorContent] = useState("");

  const handleOpenFile = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        filters: [{ name: "Excel Macro", extensions: ["xlsm"] }],
      });
      if (path) {
        await openProject(path as string);
      }
    } catch {
      // Dev mode fallback
      console.log("File dialog not available outside Tauri");
    }
  }, [openProject]);

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
    </div>
  );
}

export default App;
