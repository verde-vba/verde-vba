import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banner } from "./components/Banner";
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
import { type ParsedError, parseBackendError, toI18nKey } from "./lib/error-parse";
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
  const [errorBanner, setErrorBanner] = useState<ParsedError | null>(null);

  // Routes a ParsedError variant to the appropriate UI surface. Kept as a
  // single function so the exhaustive `never` default forces every future
  // ParsedError kind to be handled in one place rather than scattered across
  // catch sites.
  //
  // INVARIANT: `locked` is intentionally NOT routed to the generic
  // errorBanner. It carries contextual data (xlsmPath) that lives at the
  // call site, and it has its own dedicated UI (LockDialog). Each catch
  // site is responsible for short-circuiting locked into setLockPrompt
  // before delegating the residual kinds here.
  const routeParsedError = useCallback((parsed: ParsedError) => {
    switch (parsed.kind) {
      case "locked":
        // No-op: locked must be handled at the call site (see invariant
        // above). Reaching this branch means a caller forgot to
        // short-circuit; we drop it rather than render a misleading
        // generic banner that the user cannot act on.
        return;
      case "excelOpen":
        setExcelOpenPrompt(parsed.detail);
        return;
      case "projectNotFound":
      case "projectCorrupted":
      case "generic":
        setErrorBanner(parsed);
        return;
      default: {
        const _exhaustive: never = parsed;
        return _exhaustive;
      }
    }
  }, []);

  // Wraps a caught backend error so each callback short-circuits the
  // locked kind into setLockPrompt (with the xlsmPath context only the
  // call site knows) before delegating residual kinds to routeParsedError.
  // Centralizing this keeps the four catch sites in lockstep on the
  // "locked never reaches the generic banner" invariant.
  const handleCaughtBackendError = useCallback(
    (e: unknown, xlsmPath: string | null) => {
      const parsed = parseBackendError(e);
      if (parsed.kind === "locked" && xlsmPath) {
        setLockPrompt({
          xlsmPath,
          user: parsed.user,
          machine: parsed.machine,
          time: parsed.time,
        });
        return;
      }
      routeParsedError(parsed);
    },
    [routeParsedError]
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
        handleCaughtBackendError(e, xlsmPath);
      }
    } catch {
      // Dev mode fallback (plugin-dialog only available inside Tauri runtime)
      console.log("File dialog not available outside Tauri");
    }
  }, [openProject, handleCaughtBackendError]);

  const handleForceOpen = useCallback(async () => {
    if (!lockPrompt) return;
    const { xlsmPath } = lockPrompt;
    setLockPrompt(null);
    try {
      await forceOpenProject(xlsmPath);
    } catch (e) {
      handleCaughtBackendError(e, xlsmPath);
    }
  }, [lockPrompt, forceOpenProject, handleCaughtBackendError]);

  const handleOpenReadOnly = useCallback(async () => {
    if (!lockPrompt) return;
    const { xlsmPath } = lockPrompt;
    setLockPrompt(null);
    try {
      await openProjectReadOnly(xlsmPath);
    } catch (e) {
      handleCaughtBackendError(e, xlsmPath);
    }
  }, [lockPrompt, openProjectReadOnly, handleCaughtBackendError]);

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
        handleCaughtBackendError(e, project?.xlsm_path ?? null);
      }
      // TODO: wire ConflictDialog here once the backend reports
      // file-vs-Excel content conflicts (different from EXCEL_OPEN, which
      // is a save-time lock condition rather than a content conflict).
    },
    [activeModule, saveModule, t, handleCaughtBackendError, project?.xlsm_path]
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
