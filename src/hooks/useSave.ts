import { useCallback, useState } from "react";
import type { ModuleInfo } from "../lib/types";

const SAVE_BLOCKED_READONLY = "SAVE_BLOCKED_READONLY";

interface UseSaveOptions {
  activeModule: ModuleInfo | null;
  saveModule: (filename: string, content: string) => Promise<void>;
  setExcelOpenPrompt: (s: string | null) => void;
  handleCaughtBackendError: (e: unknown, xlsmPath: string | null) => void;
  saveBlockedMessage: string;
  xlsmPath: string | null;
}

export function useSave({
  activeModule,
  saveModule,
  setExcelOpenPrompt,
  handleCaughtBackendError,
  saveBlockedMessage,
  xlsmPath,
}: UseSaveOptions) {
  const [saveBlockedPrompt, setSaveBlockedPrompt] = useState<string | null>(null);

  const handleSave = useCallback(
    async (content: string) => {
      if (!activeModule) return;
      try {
        await saveModule(activeModule.filename, content);
        setExcelOpenPrompt(null);
        setSaveBlockedPrompt(null);
      } catch (e) {
        // Read-only saves short-circuit in the hook with a sentinel
        // message — translate it at the call site rather than leaking
        // the constant into the render tree.
        if (e instanceof Error && e.message === SAVE_BLOCKED_READONLY) {
          setSaveBlockedPrompt(saveBlockedMessage);
          return;
        }
        handleCaughtBackendError(e, xlsmPath);
      }
      // TODO: wire ConflictDialog here once the backend reports
      // file-vs-Excel content conflicts (different from EXCEL_OPEN, which
      // is a save-time lock condition rather than a content conflict).
    },
    [activeModule, saveModule, setExcelOpenPrompt, handleCaughtBackendError, saveBlockedMessage, xlsmPath]
  );

  return { saveBlockedPrompt, setSaveBlockedPrompt, handleSave };
}
