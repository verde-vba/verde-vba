import { useCallback, useEffect, useRef, useState } from "react";
import { withTauriWindow } from "../lib/tauri-window";

export interface UseWindowCloseGuardOptions {
  dirtyModules: ReadonlySet<string>;
  getBufferContent: (filename: string) => string;
  save: (content: string) => Promise<boolean>;
  onDiscard?: () => void;
}

export interface UseWindowCloseGuardResult {
  windowCloseRequested: boolean;
  saveAll: () => Promise<void>;
  discardAll: () => void;
  cancelClose: () => void;
}

/**
 * Intercepts Tauri's window-close request when there are dirty buffers,
 * exposes the prompt flag, and handles the save-all / discard-all /
 * cancel branches. The `onDiscard` callback runs before the window is
 * destroyed so callers can clear persistent state (e.g. hot-exit).
 */
export function useWindowCloseGuard({
  dirtyModules,
  getBufferContent,
  save,
  onDiscard,
}: UseWindowCloseGuardOptions): UseWindowCloseGuardResult {
  const [windowCloseRequested, setWindowCloseRequested] = useState(false);
  const dirtyModulesRef = useRef(dirtyModules);
  dirtyModulesRef.current = dirtyModules;

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void withTauriWindow((getCurrentWindow) => {
      getCurrentWindow()
        .onCloseRequested((event) => {
          if (dirtyModulesRef.current.size > 0) {
            event.preventDefault();
            setWindowCloseRequested(true);
          }
        })
        .then((fn) => {
          unlisten = fn;
        });
    });
    return () => {
      unlisten?.();
    };
  }, []);

  const saveAll = useCallback(async () => {
    for (const filename of dirtyModules) {
      await save(getBufferContent(filename));
    }
    setWindowCloseRequested(false);
    void withTauriWindow(
      (getCurrentWindow) => {
        getCurrentWindow().close();
      },
      () => {
        window.close();
      },
    );
  }, [dirtyModules, save, getBufferContent]);

  const discardAll = useCallback(() => {
    onDiscard?.();
    setWindowCloseRequested(false);
    void withTauriWindow(
      (getCurrentWindow) => {
        getCurrentWindow().destroy();
      },
      () => {
        window.close();
      },
    );
  }, [onDiscard]);

  const cancelClose = useCallback(() => {
    setWindowCloseRequested(false);
  }, []);

  return { windowCloseRequested, saveAll, discardAll, cancelClose };
}
