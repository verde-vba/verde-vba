import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banner } from "./components/Banner";
import { ConflictDialog } from "./components/ConflictDialog";
import { Editor } from "./components/Editor";
import { Loader } from "./components/Loader";
import { LockDialog } from "./components/LockDialog";
import { SaveConfirmDialog } from "./components/SaveConfirmDialog";
import { ReadOnlyBar } from "./components/ReadOnlyBar";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { TabBar } from "./components/TabBar";
import { TrustGuideDialog } from "./components/TrustGuideDialog";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { getInitialFile, readModule } from "./lib/tauri-commands";
import type { ModuleInfo } from "./lib/types";
import { useErrorRouting } from "./hooks/useErrorRouting";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useModuleTabs } from "./hooks/useModuleTabs";
import { useOpenFile } from "./hooks/useOpenFile";
import { useSave } from "./hooks/useSave";
import { useTheme } from "./hooks/useTheme";
import { useTrust } from "./hooks/useTrust";
import { useVerdeProject } from "./hooks/useVerdeProject";
import { toI18nKey } from "./lib/error-parse";
import { saveHotExit, loadHotExit, clearHotExit } from "./lib/hot-exit";

function App() {
  const { resolved } = useTheme("system");
  const { t } = useTranslation();
  const {
    project,
    activeModule,
    loading: projectLoading,
    readOnly,
    conflict,
    openProject,
    forceOpenProject,
    openProjectReadOnly,
    setActiveModule,
    saveModule,
    resolveConflict,
    resolveConflictPerModule,
  } = useVerdeProject();
  const {
    acknowledged: trustAcknowledged,
    acknowledge: acknowledgeTrust,
    reset: resetTrust,
  } = useTrust();
  const {
    errorBanner,
    setErrorBanner,
    excelOpenPrompt,
    setExcelOpenPrompt,
    routeParsedError,
  } = useErrorRouting({ onTrustAccessDenied: resetTrust });
  const { openModules, handleSelectModule, handleCloseModule } = useModuleTabs({
    activeModule,
    setActiveModule,
  });
  const {
    lockPrompt,
    handleCaughtBackendError,
    handleOpenFile,
    handleForceOpen,
    handleOpenReadOnly,
    handleLockCancel,
  } = useOpenFile({
    openProject,
    forceOpenProject,
    openProjectReadOnly,
    routeParsedError,
    fileTypeLabel: t("common.fileTypeExcelMacro"),
  });
  const { saveBlockedPrompt, setSaveBlockedPrompt, handleSave, isSaving } = useSave({
    activeModule,
    saveModule,
    setExcelOpenPrompt,
    handleCaughtBackendError,
    saveBlockedMessage: t("status.saveBlocked"),
    xlsmPath: project?.xlsm_path ?? null,
  });
  const [editorContent, setEditorContent] = useState("");
  const [moduleLoading, setModuleLoading] = useState(false);
  const buffersRef = useRef(new Map<string, string>());
  const savedContentsRef = useRef(new Map<string, string>());
  const [dirtyModules, setDirtyModules] = useState<ReadonlySet<string>>(new Set());
  const [fileConflict, setFileConflict] = useState<string | null>(null);

  useFileWatcher({
    projectId: project?.project_id ?? null,
    projectDir: project?.project_dir ?? null,
    activeModuleFilename: activeModule?.filename ?? null,
    isDirty: (filename) => dirtyModules.has(filename),
    onReload: (filename, content) => {
      buffersRef.current.set(filename, content);
      savedContentsRef.current.set(filename, content);
      setEditorContent(content);
      setDirtyModules((prev) => {
        if (!prev.has(filename)) return prev;
        const next = new Set(prev);
        next.delete(filename);
        return next;
      });
    },
    onConflict: (filename) => {
      setFileConflict(filename);
    },
    onInvalidate: (filename) => {
      buffersRef.current.delete(filename);
      savedContentsRef.current.delete(filename);
    },
  });

  // Restore hot-exit buffers when a project is opened.
  // Runs before the module-load effect so buffersRef is pre-populated.
  useEffect(() => {
    if (!project) return;
    const data = loadHotExit(project.project_id);
    if (!data) return;

    for (const [filename, content] of Object.entries(data.buffers)) {
      buffersRef.current.set(filename, content);
    }

    // Read disk content to determine which buffers are actually dirty.
    Promise.all(
      Object.entries(data.buffers).map(async ([filename, hotContent]) => {
        try {
          const diskContent = await readModule(project.project_id, filename);
          savedContentsRef.current.set(filename, diskContent);
          return diskContent !== hotContent ? filename : null;
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      const dirty = results.filter(Boolean) as string[];
      if (dirty.length > 0) {
        setDirtyModules(new Set(dirty));
      }
      clearHotExit(project.project_id);
    });
  }, [project]);

  // Load module content from buffer (instant) or disk (first open).
  useEffect(() => {
    if (!project || !activeModule) {
      setEditorContent("");
      setModuleLoading(false);
      return;
    }

    const buffered = buffersRef.current.get(activeModule.filename);
    if (buffered !== undefined) {
      setEditorContent(buffered);
      setModuleLoading(false);
      return;
    }

    let cancelled = false;
    setModuleLoading(true);
    readModule(project.project_id, activeModule.filename).then(
      (content) => {
        if (!cancelled) {
          buffersRef.current.set(activeModule.filename, content);
          savedContentsRef.current.set(activeModule.filename, content);
          setEditorContent(content);
          setDirtyModules((prev) => {
            if (!prev.has(activeModule.filename)) return prev;
            const next = new Set(prev);
            next.delete(activeModule.filename);
            return next;
          });
          setModuleLoading(false);
        }
      },
      (err) => {
        console.error("Failed to read module:", err);
        if (!cancelled) {
          setEditorContent("");
          setModuleLoading(false);
        }
      }
    );
    return () => { cancelled = true; };
  }, [project, activeModule]);

  const handleEditorChange = useCallback(
    (content: string) => {
      setEditorContent(content);
      if (!activeModule) return;
      buffersRef.current.set(activeModule.filename, content);
      const isDirty = content !== savedContentsRef.current.get(activeModule.filename);
      setDirtyModules((prev) => {
        const wasDirty = prev.has(activeModule.filename);
        if (isDirty === wasDirty) return prev;
        const next = new Set(prev);
        if (isDirty) next.add(activeModule.filename);
        else next.delete(activeModule.filename);
        return next;
      });
    },
    [activeModule],
  );

  const handleSaveAndTrack = useCallback(
    async (content: string) => {
      const ok = await handleSave(content);
      if (ok && activeModule) {
        savedContentsRef.current.set(activeModule.filename, content);
        setDirtyModules((prev) => {
          if (!prev.has(activeModule.filename)) return prev;
          const next = new Set(prev);
          next.delete(activeModule.filename);
          return next;
        });
      }
    },
    [handleSave, activeModule],
  );

  // --- Tab close with save confirmation for dirty modules ---
  const [pendingClose, setPendingClose] = useState<ModuleInfo | null>(null);

  const doCloseModule = useCallback(
    (mod: ModuleInfo) => {
      buffersRef.current.delete(mod.filename);
      savedContentsRef.current.delete(mod.filename);
      setDirtyModules((prev) => {
        if (!prev.has(mod.filename)) return prev;
        const next = new Set(prev);
        next.delete(mod.filename);
        return next;
      });
      handleCloseModule(mod);
    },
    [handleCloseModule],
  );

  const handleCloseModuleWithCleanup = useCallback(
    (mod: ModuleInfo) => {
      if (dirtyModules.has(mod.filename)) {
        setPendingClose(mod);
        return;
      }
      doCloseModule(mod);
    },
    [dirtyModules, doCloseModule],
  );

  const handleSaveAndClose = useCallback(async () => {
    if (!pendingClose) return;
    const content = buffersRef.current.get(pendingClose.filename) ?? "";
    const ok = await handleSave(content);
    if (ok) {
      doCloseModule(pendingClose);
    }
    setPendingClose(null);
  }, [pendingClose, handleSave, doCloseModule]);

  const handleDiscardAndClose = useCallback(() => {
    if (!pendingClose) return;
    doCloseModule(pendingClose);
    setPendingClose(null);
  }, [pendingClose, doCloseModule]);

  const handleCancelClose = useCallback(() => {
    setPendingClose(null);
    setWindowCloseRequested(false);
  }, []);

  // --- Window close with save confirmation ---
  const [windowCloseRequested, setWindowCloseRequested] = useState(false);
  const dirtyModulesRef = useRef(dirtyModules);
  dirtyModulesRef.current = dirtyModules;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow().onCloseRequested((event) => {
        if (dirtyModulesRef.current.size > 0) {
          event.preventDefault();
          setWindowCloseRequested(true);
        }
      }).then((fn) => { unlisten = fn; });
    }).catch(() => { /* not in Tauri runtime */ });
    return () => { unlisten?.(); };
  }, []);

  const handleWindowSaveAll = useCallback(async () => {
    for (const filename of dirtyModules) {
      const content = buffersRef.current.get(filename) ?? "";
      await handleSave(content);
    }
    setWindowCloseRequested(false);
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow().close();
    }).catch(() => { window.close(); });
  }, [dirtyModules, handleSave]);

  const handleWindowDiscardAll = useCallback(() => {
    if (project) clearHotExit(project.project_id);
    setWindowCloseRequested(false);
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow().destroy();
    }).catch(() => { window.close(); });
  }, [project]);

  const handleWindowCancelClose = useCallback(() => {
    setWindowCloseRequested(false);
  }, []);

  // Update window title to reflect active module & dirty state.
  useEffect(() => {
    const parts: string[] = [];
    if (activeModule) {
      const prefix = dirtyModules.has(activeModule.filename) ? "● " : "";
      parts.push(`${prefix}${activeModule.filename}`);
    }
    if (project) {
      const xlsmName = project.xlsm_path.split(/[\\/]/).pop() ?? "";
      if (xlsmName) parts.push(xlsmName);
    }
    parts.push("Verde");
    const title = parts.join(" — ");
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow().setTitle(title);
    }).catch(() => {
      document.title = title;
    });
  }, [activeModule, dirtyModules, project]);

  // Hot-exit: persist dirty buffers so they survive crashes.
  const hotExitTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const projectRef = useRef(project);
  projectRef.current = project;

  useEffect(() => {
    if (!project) return;
    clearTimeout(hotExitTimerRef.current);
    if (dirtyModules.size === 0) {
      clearHotExit(project.project_id);
      return;
    }
    hotExitTimerRef.current = setTimeout(() => {
      const buffers: Record<string, string> = {};
      for (const filename of dirtyModules) {
        const content = buffersRef.current.get(filename);
        if (content !== undefined) buffers[filename] = content;
      }
      saveHotExit(project.project_id, { buffers });
    }, 2000);
    return () => clearTimeout(hotExitTimerRef.current);
  }, [project, dirtyModules, editorContent]);

  // Last-chance hot-exit save on beforeunload (crash / force-close).
  useEffect(() => {
    const handleBeforeUnload = () => {
      const p = projectRef.current;
      if (!p || dirtyModulesRef.current.size === 0) return;
      const buffers: Record<string, string> = {};
      for (const filename of dirtyModulesRef.current) {
        const content = buffersRef.current.get(filename);
        if (content !== undefined) buffers[filename] = content;
      }
      saveHotExit(p.project_id, { buffers });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Auto-open the file passed via CLI (right-click "Open with Verde").
  // get_initial_file uses take() on the Rust side, so re-runs are harmless.
  useEffect(() => {
    getInitialFile().then((path) => {
      if (path) {
        openProject(path).catch((e) => {
          handleCaughtBackendError(e, path);
        });
      }
    });
  }, [openProject, handleCaughtBackendError]);

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

  const handleFileConflictReload = useCallback(async () => {
    if (!project || !fileConflict) return;
    try {
      const content = await readModule(project.project_id, fileConflict);
      buffersRef.current.set(fileConflict, content);
      savedContentsRef.current.set(fileConflict, content);
      if (activeModule?.filename === fileConflict) {
        setEditorContent(content);
      }
      setDirtyModules((prev) => {
        if (!prev.has(fileConflict)) return prev;
        const next = new Set(prev);
        next.delete(fileConflict);
        return next;
      });
    } finally {
      setFileConflict(null);
    }
  }, [project, fileConflict, activeModule]);

  const [conflictResolving, setConflictResolving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const handleKeepFile = useCallback(async () => {
    setConflictResolving(true);
    setConflictError(null);
    try {
      await resolveConflict("verde");
    } catch (e) {
      setConflictError(e instanceof Error ? e.message : String(e));
    } finally {
      setConflictResolving(false);
    }
  }, [resolveConflict]);

  const handleKeepExcel = useCallback(async () => {
    setConflictResolving(true);
    setConflictError(null);
    try {
      await resolveConflict("excel");
    } catch (e) {
      setConflictError(e instanceof Error ? e.message : String(e));
    } finally {
      setConflictResolving(false);
    }
  }, [resolveConflict]);

  const handleResolvePerModule = useCallback(
    async (decisions: Record<string, "verde" | "excel">) => {
      setConflictResolving(true);
      setConflictError(null);
      try {
        await resolveConflictPerModule(decisions);
      } catch (e) {
        setConflictError(e instanceof Error ? e.message : String(e));
      } finally {
        setConflictResolving(false);
      }
    },
    [resolveConflictPerModule]
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
              {readOnly && <ReadOnlyBar />}
              <TabBar
                openModules={openModules}
                activeModule={activeModule}
                dirtyModules={dirtyModules}
                onSelectModule={handleSelectModule}
                onCloseModule={handleCloseModuleWithCleanup}
              />
              {activeModule ? (
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {moduleLoading && <Loader />}
                {isSaving && <Loader message={t("editor.saving")} />}
                <Editor
                  filename={activeModule.filename}
                  content={editorContent}
                  theme={resolved}
                  projectDir={project?.project_dir}
                  onSave={handleSaveAndTrack}
                  onChange={handleEditorChange}
                  onTreeSitterLoadError={() =>
                    setErrorBanner({
                      kind: "generic",
                      message: t("errors.treeSitterWasmMissing"),
                    })
                  }
                  onLspLoadError={(reason, detail) => {
                    // Each reason maps to a distinct remediation string.
                    // Keeping the switch here (rather than in the hook)
                    // keeps `useLspClient` transport-pure.
                    const key =
                      reason === "not-spawned"
                        ? "errors.lspNotSpawned"
                        : reason === "spawn-failed"
                          ? "errors.lspSpawnFailed"
                          : reason === "exit"
                            ? "errors.lspExited"
                            : "errors.lspInitializeFailed";
                    const msg = detail ? `${t(key)} (${detail})` : t(key);
                    setErrorBanner({ kind: "generic", message: msg });
                  }}
                />
                </div>
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  {t("editor.noEditorOpen")}
                </div>
              )}
            </>
          ) : projectLoading ? (
            <div style={{ flex: 1, position: "relative" }}>
              <Loader />
            </div>
          ) : (
            <WelcomeScreen onOpenFile={handleOpenFile} />
          )}
        </div>
      </div>

      {errorBanner &&
        (() => {
          const key = toI18nKey(errorBanner);
          const title = key ? t(`${key}.title`) : undefined;
          const message =
            key
              ? t(`${key}.message`)
              : errorBanner.kind === "generic"
                ? errorBanner.message
                : "";
          return (
            <Banner
              tone="error"
              onDismiss={() => setErrorBanner(null)}
              dismissLabel={t("common.dismiss")}
            >
              {title ? <strong>{title}: </strong> : null}
              {message}
            </Banner>
          );
        })()}

      {saveBlockedPrompt && (
        <Banner
          tone="warning"
          onDismiss={() => setSaveBlockedPrompt(null)}
          dismissLabel={t("common.dismiss")}
        >
          {saveBlockedPrompt}
        </Banner>
      )}

      {excelOpenPrompt && (
        <Banner
          tone="warning"
          onDismiss={() => setExcelOpenPrompt(null)}
          dismissLabel={t("common.dismiss")}
        >
          {t("status.excelOpen")}
          {excelOpenPrompt ? ` (${excelOpenPrompt})` : ""}
        </Banner>
      )}

      {fileConflict && (
        <Banner
          tone="warning"
          onDismiss={() => setFileConflict(null)}
          dismissLabel={t("fileWatcher.keep")}
        >
          {t("fileWatcher.conflict", { filename: fileConflict })}{" "}
          <button
            type="button"
            onClick={handleFileConflictReload}
            style={{
              padding: "2px 10px",
              background: "transparent",
              color: "inherit",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              marginLeft: "8px",
            }}
          >
            {t("fileWatcher.reload")}
          </button>
        </Banner>
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

      {conflict != null && project != null && (
        <ConflictDialog
          projectId={conflict.projectId}
          xlsmPath={project.xlsm_path}
          count={conflict.modules.length}
          modules={conflict.modules}
          resolving={conflictResolving}
          error={conflictError}
          theme={resolved}
          onKeepFile={handleKeepFile}
          onKeepExcel={handleKeepExcel}
          onResolvePerModule={handleResolvePerModule}
        />
      )}

      {pendingClose && !windowCloseRequested && (
        <SaveConfirmDialog
          filename={pendingClose.filename}
          onSave={handleSaveAndClose}
          onDiscard={handleDiscardAndClose}
          onCancel={handleCancelClose}
        />
      )}

      {windowCloseRequested && (
        <SaveConfirmDialog
          variant="window"
          onSave={handleWindowSaveAll}
          onDiscard={handleWindowDiscardAll}
          onCancel={handleWindowCancelClose}
        />
      )}
    </div>
  );
}

export default App;
