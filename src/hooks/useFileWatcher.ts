// File watcher hook — listens for `verde://file-changed` events from the
// Rust backend and dispatches to the appropriate callback depending on
// whether the changed file is active and whether the editor has unsaved
// changes.
//
// Wire contract (agreed with `src-tauri/src/file_watcher.rs`):
//
//   Event  `verde://file-changed`  →  `{ filename: string, kind: string }`

import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  startFileWatcher,
  stopFileWatcher,
  readModule,
} from "../lib/tauri-commands";

export const FILE_CHANGED_EVENT = "verde://file-changed";

export interface FileChangedPayload {
  filename: string;
  kind: string;
}

export interface UseFileWatcherOptions {
  projectId: string | null;
  projectDir: string | null;
  activeModuleFilename: string | null;
  isDirty: (filename: string) => boolean;
  onReload: (filename: string, content: string) => void;
  onConflict: (filename: string) => void;
  onInvalidate: (filename: string) => void;
}

export function useFileWatcher(options: UseFileWatcherOptions) {
  // Ref-ify callbacks and dynamic values so the effect doesn't re-run
  // every time the parent re-renders.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const { projectDir } = optionsRef.current;
    if (!projectDir) return;

    let cancelled = false;

    startFileWatcher(projectDir).catch((e) => {
      console.warn("Failed to start file watcher:", e);
    });

    const unlistenPromise = listen<FileChangedPayload>(
      FILE_CHANGED_EVENT,
      (event) => {
        if (cancelled) return;

        const { filename } = event.payload;
        const {
          projectId,
          activeModuleFilename,
          isDirty,
          onReload,
          onConflict,
          onInvalidate,
        } = optionsRef.current;

        if (filename === activeModuleFilename) {
          if (isDirty(filename)) {
            onConflict(filename);
          } else {
            if (!projectId) return;
            readModule(projectId, filename).then(
              (content) => {
                if (!cancelled) onReload(filename, content);
              },
              (err) => {
                console.warn("Failed to reload module after external change:", err);
              },
            );
          }
        } else {
          onInvalidate(filename);
        }
      },
    );

    return () => {
      cancelled = true;
      unlistenPromise.then((unlisten) => unlisten());
      stopFileWatcher().catch((e) => {
        console.warn("Failed to stop file watcher:", e);
      });
    };
  }, [options.projectDir]);
}
