import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMonaco } from "@monaco-editor/react";
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
import { readModule } from "./lib/tauri-commands";
import type { ModuleInfo } from "./lib/types";
import type { LspStatus } from "./hooks/useLspClient";
import { useConflictResolver } from "./hooks/useConflictResolver";
import { useErrorRouting } from "./hooks/useErrorRouting";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useHotExit } from "./hooks/useHotExit";
import { useInitialFileOpen } from "./hooks/useInitialFileOpen";
import { useModuleTabs } from "./hooks/useModuleTabs";
import { useOpenFile } from "./hooks/useOpenFile";
import { useSave } from "./hooks/useSave";
import { useTheme } from "./hooks/useTheme";
import { useTrust } from "./hooks/useTrust";
import { useVerdeProject } from "./hooks/useVerdeProject";
import { useWindowCloseGuard } from "./hooks/useWindowCloseGuard";
import { useWindowTitle } from "./hooks/useWindowTitle";
import { useWorkspaceModels } from "./hooks/useWorkspaceModels";
import { toI18nKey } from "./lib/error-parse";
import { clearHotExit } from "./lib/hot-exit";

// Identity-preserving Set updater: returns the same reference when the
// operation is a no-op, so React bails out of re-rendering downstream
// consumers that only depend on the Set's identity.
function removeFromSet<T>(set: ReadonlySet<T>, item: T): ReadonlySet<T> {
  if (!set.has(item)) return set;
  const next = new Set(set);
  next.delete(item);
  return next;
}

function toggleInSet<T>(
  set: ReadonlySet<T>,
  item: T,
  shouldContain: boolean,
): ReadonlySet<T> {
  if (set.has(item) === shouldContain) return set;
  const next = new Set(set);
  if (shouldContain) next.add(item);
  else next.delete(item);
  return next;
}

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
  const monaco = useMonaco();
  useWorkspaceModels(
    monaco,
    project?.project_id ?? null,
    project?.project_dir ?? null,
    project?.modules ?? null,
  );
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
    opening,
    lockProcessing,
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
  const [lspStatus, setLspStatus] = useState<LspStatus>("stopped");
  const buffersRef = useRef(new Map<string, string>());
  const savedContentsRef = useRef(new Map<string, string>());
  const [dirtyModules, setDirtyModules] = useState<ReadonlySet<string>>(new Set());
  const [fileConflict, setFileConflict] = useState<string | null>(null);

  // ── Synchronize editor content on active-module change ──
  // React's "adjust state during rendering" pattern ensures the very first
  // render after a tab switch already carries the correct content.  Without
  // this, @monaco-editor/react receives a new `path` while `value` still
  // holds the *previous* module's text, which can crash Monaco and leave a
  // white screen.
  const [prevActiveFilename, setPrevActiveFilename] = useState<string | null>(null);
  if ((activeModule?.filename ?? null) !== prevActiveFilename) {
    setPrevActiveFilename(activeModule?.filename ?? null);
    if (activeModule) {
      const buffered = buffersRef.current.get(activeModule.filename);
      setEditorContent(buffered ?? "");
      setModuleLoading(buffered === undefined && !!project);
    } else {
      setEditorContent("");
      setModuleLoading(false);
    }
  }

  useFileWatcher({
    projectId: project?.project_id ?? null,
    projectDir: project?.project_dir ?? null,
    activeModuleFilename: activeModule?.filename ?? null,
    isDirty: (filename) => dirtyModules.has(filename),
    onReload: (filename, content) => {
      buffersRef.current.set(filename, content);
      savedContentsRef.current.set(filename, content);
      setEditorContent(content);
      setDirtyModules((prev) => removeFromSet(prev, filename));
    },
    onConflict: (filename) => {
      setFileConflict(filename);
    },
    onInvalidate: (filename) => {
      buffersRef.current.delete(filename);
      savedContentsRef.current.delete(filename);
    },
  });

  useHotExit({
    project,
    dirtyModules,
    buffersRef,
    savedContentsRef,
    onRestoreDirty: (filenames) => setDirtyModules(new Set(filenames)),
    contentVersion: editorContent,
  });

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
          setDirtyModules((prev) => removeFromSet(prev, activeModule.filename));
          setModuleLoading(false);
        }
      },
      (err) => {
        console.error("Failed to read module:", err);
        if (!cancelled) {
          setEditorContent("");
          setModuleLoading(false);
          setErrorBanner({
            kind: "generic",
            message: t("errors.moduleReadFailed", { filename: activeModule.filename }),
          });
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
      setDirtyModules((prev) => toggleInSet(prev, activeModule.filename, isDirty));
    },
    [activeModule],
  );

  const handleSaveAndTrack = useCallback(
    async (content: string) => {
      const ok = await handleSave(content);
      if (ok && activeModule) {
        savedContentsRef.current.set(activeModule.filename, content);
        setDirtyModules((prev) => removeFromSet(prev, activeModule.filename));
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
      setDirtyModules((prev) => removeFromSet(prev, mod.filename));
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

  const {
    windowCloseRequested,
    saveAll: handleWindowSaveAll,
    discardAll: handleWindowDiscardAll,
    cancelClose: handleWindowCancelClose,
  } = useWindowCloseGuard({
    dirtyModules,
    getBufferContent: (filename) => buffersRef.current.get(filename) ?? "",
    save: handleSave,
    onDiscard: () => {
      if (project) clearHotExit(project.project_id);
    },
  });

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
    handleWindowCancelClose();
  }, [handleWindowCancelClose]);

  useWindowTitle(activeModule, dirtyModules, project);

  useInitialFileOpen(openProject, handleCaughtBackendError);

  // ── Cross-file navigation (go-to-definition across modules) ──
  const pendingRevealRef = useRef<{ lineNumber: number; column: number } | null>(null);

  const handleNavigateToModule = useCallback(
    (filename: string, lineNumber?: number, column?: number) => {
      const mod = project?.modules?.find((m) => m.filename === filename);
      if (mod) {
        pendingRevealRef.current =
          lineNumber != null ? { lineNumber, column: column ?? 1 } : null;
        handleSelectModule(mod);
      }
    },
    [project, handleSelectModule],
  );

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
      setDirtyModules((prev) => removeFromSet(prev, fileConflict));
    } finally {
      setFileConflict(null);
    }
  }, [project, fileConflict, activeModule]);

  const {
    resolving: conflictResolving,
    error: conflictError,
    keepVerde: handleKeepFile,
    keepExcel: handleKeepExcel,
    perModule: handleResolvePerModule,
  } = useConflictResolver({ resolveConflict, resolveConflictPerModule });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {project && (
          <Sidebar
            modules={project.modules}
            activeModule={activeModule}
            onSelectModule={handleSelectModule}
            disabled={moduleLoading}
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
                disabled={moduleLoading}
                onSelectModule={handleSelectModule}
                onCloseModule={handleCloseModuleWithCleanup}
              />
              {activeModule ? (
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                {moduleLoading && <Loader />}
                {isSaving && <Loader message={t("editor.saving")} />}
                <Editor
                  key={activeModule.filename}
                  filename={activeModule.filename}
                  content={editorContent}
                  theme={resolved}
                  projectDir={project?.project_dir}
                  onSave={handleSaveAndTrack}
                  onChange={handleEditorChange}
                  onNavigateToModule={handleNavigateToModule}
                  pendingRevealRef={pendingRevealRef}
                  onTreeSitterLoadError={() =>
                    setErrorBanner({
                      kind: "generic",
                      message: t("errors.treeSitterWasmMissing"),
                    })
                  }
                  onLspStatusChange={setLspStatus}
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
            <WelcomeScreen onOpenFile={handleOpenFile} opening={opening} />
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
        lspStatus={lspStatus}
      />

      {lockPrompt && (
        <LockDialog
          lock={{
            user: lockPrompt.user,
            machine: lockPrompt.machine,
            time: lockPrompt.time,
          }}
          processing={lockProcessing}
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
