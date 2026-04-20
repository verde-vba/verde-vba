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
import { useErrorRouting } from "./hooks/useErrorRouting";
import { useModuleTabs } from "./hooks/useModuleTabs";
import { useOpenFile } from "./hooks/useOpenFile";
import { useTheme } from "./hooks/useTheme";
import { useTrust } from "./hooks/useTrust";
import { SAVE_BLOCKED_READONLY, useVerdeProject } from "./hooks/useVerdeProject";
import { toI18nKey } from "./lib/error-parse";

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
  const {
    errorBanner,
    setErrorBanner,
    excelOpenPrompt,
    setExcelOpenPrompt,
    routeParsedError,
  } = useErrorRouting();
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
  const [editorContent, setEditorContent] = useState("");
  const [saveBlockedPrompt, setSaveBlockedPrompt] = useState<string | null>(
    null
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

  const handleKeepFile = useCallback(() => {
    void resolveConflict("verde");
  }, [resolveConflict]);

  const handleKeepExcel = useCallback(() => {
    void resolveConflict("excel");
  }, [resolveConflict]);


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
