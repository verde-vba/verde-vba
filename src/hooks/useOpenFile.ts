import { useCallback, useRef, useState } from "react";
import { type ParsedError, parseBackendError } from "../lib/error-parse";

interface LockPrompt {
  xlsmPath: string;
  user: string;
  machine: string;
  time: string;
}

interface UseOpenFileOptions {
  openProject: (path: string) => Promise<void>;
  forceOpenProject: (path: string) => Promise<void>;
  openProjectReadOnly: (path: string) => Promise<void>;
  routeParsedError: (parsed: ParsedError) => void;
  fileTypeLabel: string;
}

export function useOpenFile({
  openProject,
  forceOpenProject,
  openProjectReadOnly,
  routeParsedError,
  fileTypeLabel,
}: UseOpenFileOptions) {
  const [lockPrompt, setLockPrompt] = useState<LockPrompt | null>(null);
  const [opening, setOpening] = useState(false);
  const [lockProcessing, setLockProcessing] = useState(false);
  const lockGuardRef = useRef(false);

  // Bridges parseBackendError with setLockPrompt (for locked) and
  // routeParsedError (for everything else). Centralizing this keeps all
  // catch sites in lockstep on the "locked never reaches the generic banner"
  // invariant documented in useErrorRouting.
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
    if (opening) return;
    setOpening(true);
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const path = await open({
        filters: [{ name: fileTypeLabel, extensions: ["xlsm"] }],
      });
      if (!path) return;
      try {
        await openProject(path);
      } catch (e) {
        handleCaughtBackendError(e, path);
      }
    } catch {
      // Dev mode fallback (plugin-dialog only available inside Tauri runtime)
      console.log("File dialog not available outside Tauri");
    } finally {
      setOpening(false);
    }
  }, [opening, openProject, handleCaughtBackendError, fileTypeLabel]);

  const handleForceOpen = useCallback(async () => {
    if (!lockPrompt || lockGuardRef.current) return;
    lockGuardRef.current = true;
    setLockProcessing(true);
    const { xlsmPath } = lockPrompt;
    try {
      await forceOpenProject(xlsmPath);
    } catch (e) {
      handleCaughtBackendError(e, xlsmPath);
    } finally {
      setLockProcessing(false);
      setLockPrompt(null);
      lockGuardRef.current = false;
    }
  }, [lockPrompt, forceOpenProject, handleCaughtBackendError]);

  const handleOpenReadOnly = useCallback(async () => {
    if (!lockPrompt || lockGuardRef.current) return;
    lockGuardRef.current = true;
    setLockProcessing(true);
    const { xlsmPath } = lockPrompt;
    try {
      await openProjectReadOnly(xlsmPath);
    } catch (e) {
      handleCaughtBackendError(e, xlsmPath);
    } finally {
      setLockProcessing(false);
      setLockPrompt(null);
      lockGuardRef.current = false;
    }
  }, [lockPrompt, openProjectReadOnly, handleCaughtBackendError]);

  const handleLockCancel = useCallback(() => {
    setLockPrompt(null);
  }, []);

  return {
    lockPrompt,
    opening,
    lockProcessing,
    handleCaughtBackendError,
    handleOpenFile,
    handleForceOpen,
    handleOpenReadOnly,
    handleLockCancel,
  };
}
