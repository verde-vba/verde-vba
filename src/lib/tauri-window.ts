type TauriWindowModule = typeof import("@tauri-apps/api/window");

/**
 * Runs `fn` with Tauri's window API if the runtime provides it and falls
 * back to the browser equivalent otherwise. Dynamic import keeps a
 * non-Tauri runtime (tests, web preview) from exploding on first
 * evaluation of the bundle.
 */
export function withTauriWindow(
  fn: (getCurrentWindow: TauriWindowModule["getCurrentWindow"]) => void,
  fallback?: () => void,
): Promise<void> {
  return import("@tauri-apps/api/window")
    .then(({ getCurrentWindow }) => {
      fn(getCurrentWindow);
    })
    .catch(() => {
      fallback?.();
    });
}
