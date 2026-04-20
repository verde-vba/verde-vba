import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectInfo } from "../lib/types";

// Mirror useTrust.test.ts: intercept the Tauri IPC boundary so the real
// command wrappers in `tauri-commands.ts` flow through our mock without
// needing to stub each wrapper individually.
const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

import { useVerdeProject } from "./useVerdeProject";

function makeProject(overrides?: Partial<ProjectInfo>): ProjectInfo {
  return {
    project_id: "abc123",
    xlsm_path: "C:/tmp/test.xlsm",
    project_dir: "C:/tmp/verde/abc123",
    modules: [],
    ...overrides,
  };
}

// Every syncToExcel test needs the same prelude: open_project resolves to
// a fresh ProjectInfo, check_conflict returns an empty list (so no
// conflict dialog steals focus), and only the sync_to_excel branch
// varies per test. Extracting the setup keeps the mock scaffolding from
// drowning the assertion that actually characterizes the behavior.
async function setupOpenedProject(
  syncHandler: () => Promise<unknown>
): Promise<{
  result: ReturnType<typeof renderHook<ReturnType<typeof useVerdeProject>, unknown>>["result"];
  project: ProjectInfo;
}> {
  const project = makeProject();
  invokeMock.mockImplementation((cmd: string) => {
    if (cmd === "open_project") return Promise.resolve(project);
    if (cmd === "check_conflict") return Promise.resolve([]);
    if (cmd === "sync_to_excel") return syncHandler();
    return Promise.reject(new Error(`unexpected command: ${cmd}`));
  });

  const { result } = renderHook(() => useVerdeProject());

  await act(async () => {
    await result.current.openProject(project.xlsm_path);
  });
  await waitFor(() => expect(result.current.project).not.toBeNull());

  return { result, project };
}

describe("useVerdeProject", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  describe("resolveConflict error handling", () => {
    it("records the raw backend message, rethrows, and preserves the pending conflict so the user can retry", async () => {
      // Arrange: open succeeds, the conflict check returns a non-empty
      // module list so `state.conflict` is populated. Then the next
      // `resolve_conflict` invocation rejects with the raw backend
      // substring parseBackendError keys on for `projectNotFound`.
      const project = makeProject();
      const conflictModules = [
        {
          filename: "Module1.bas",
          fileHash: "aaa",
          metaHash: "bbb",
          excelHash: "ccc",
        },
      ];
      invokeMock.mockImplementation((cmd: string) => {
        if (cmd === "open_project") return Promise.resolve(project);
        if (cmd === "check_conflict") return Promise.resolve(conflictModules);
        return Promise.reject(new Error(`unexpected command: ${cmd}`));
      });

      const { result } = renderHook(() => useVerdeProject());

      await act(async () => {
        await result.current.openProject(project.xlsm_path);
      });
      await waitFor(() => expect(result.current.conflict).not.toBeNull());

      // Swap in the rejecting impl for resolve_conflict only after the
      // open flow has settled, so the conflict-check call above isn't
      // accidentally affected by the new mock shape.
      invokeMock.mockImplementation((cmd: string) => {
        if (cmd === "resolve_conflict") {
          return Promise.reject(
            new Error("project not found: deadbeef00000000")
          );
        }
        return Promise.reject(new Error(`unexpected command: ${cmd}`));
      });

      // Act / Assert: the rejection must surface to the caller (so a UI
      // consumer can observe the failure) AND state.error must hold the
      // raw backend message AND state.conflict must remain populated so
      // the user can retry without reopening the project.
      await act(async () => {
        await expect(result.current.resolveConflict("verde")).rejects.toThrow(
          "project not found: deadbeef00000000"
        );
      });
      expect(result.current.error).toBe(
        "project not found: deadbeef00000000"
      );
      expect(result.current.conflict).not.toBeNull();
    });
  });

  describe("syncToExcel error handling", () => {
    it("routes backend errors through the message idiom so the raw substring is preserved (not prefixed with 'Error: ')", async () => {
      // Arrange: open succeeds, conflict check returns empty, sync rejects
      // with an Error whose message is the raw backend substring we want
      // parseBackendError to be able to prefix-match.
      const { result } = await setupOpenedProject(() =>
        Promise.reject(new Error("project not found: abc123"))
      );

      // Act: syncToExcel now rethrows after recording state.error so callers
      // observe the failure via promise rejection too. Awaiting on `rejects`
      // keeps the rejection handled while preserving the state assertion below.
      await act(async () => {
        await expect(result.current.syncToExcel()).rejects.toThrow(
          "project not found: abc123"
        );
      });

      // Assert: stored error must be the raw backend message (no "Error: "
      // prefix). This matches the shape runOpen/saveModule already use,
      // keeping the matcher in parseBackendError the single source of truth.
      expect(result.current.error).toBe("project not found: abc123");
    });

    it("resets loading back to false after the rethrow (finally clause)", async () => {
      // Arrange: drive syncToExcel to a rejection, then observe that the
      // loading flag the hook flips to `true` at entry is cleared before
      // control returns to the caller. The finally clause is the only
      // place that can clear it on the error path — the catch rethrows.
      const { result } = await setupOpenedProject(() =>
        Promise.reject(new Error("project not found: deadbeef00000000"))
      );

      // Sanity check: loading is false after the open flow settles so the
      // post-rejection assertion can't be trivially satisfied by an
      // initial-state coincidence.
      expect(result.current.loading).toBe(false);

      // Act: observe the rejection. After the rethrow surfaces, loading
      // MUST have been cleared — proving the finally block ran.
      await act(async () => {
        await expect(result.current.syncToExcel()).rejects.toThrow(
          "project not found: deadbeef00000000"
        );
      });

      expect(result.current.loading).toBe(false);
    });

    it("sets loading to true while the invoke is pending and back to false on resolve", async () => {
      // Arrange: open succeeds and conflict check returns empty, then we
      // stall the next sync_to_excel invoke behind a deferred promise so
      // we can observe the intermediate `loading: true` state. Without a
      // manual resolver the invoke would settle immediately and the
      // pending-state window would close before we could read it.
      let resolveInvoke: ((value: unknown) => void) | undefined;
      const pending = new Promise((r) => {
        resolveInvoke = r;
      });
      const { result } = await setupOpenedProject(() => pending);

      // Sanity: loading is false after the open flow settles so the
      // mid-flight assertion below can't be trivially satisfied by an
      // initial-state coincidence.
      expect(result.current.loading).toBe(false);

      // Kick off the call without awaiting so the invoke stays pending.
      // Wrapping in `act` flushes the setState(loading: true) that runs
      // synchronously before the awaited invoke yields.
      let syncPromise: Promise<void> | undefined;
      act(() => {
        syncPromise = result.current.syncToExcel();
      });

      // Assert: during the pending window, loading must be true. This is
      // the contract the finally clause relies on — it only makes sense if
      // the entry path first flips the flag on.
      expect(result.current.loading).toBe(true);

      // Resolve the deferred invoke and let React flush the finally's
      // setState(loading: false) before we assert the cleared state.
      await act(async () => {
        resolveInvoke?.(null);
        await syncPromise;
      });

      expect(result.current.loading).toBe(false);
    });
  });
});
