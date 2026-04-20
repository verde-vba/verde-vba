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
      const project = makeProject();
      invokeMock.mockImplementation((cmd: string) => {
        if (cmd === "open_project") return Promise.resolve(project);
        if (cmd === "check_conflict") return Promise.resolve([]);
        if (cmd === "sync_to_excel") {
          return Promise.reject(new Error("project not found: abc123"));
        }
        return Promise.reject(new Error(`unexpected command: ${cmd}`));
      });

      const { result } = renderHook(() => useVerdeProject());

      await act(async () => {
        await result.current.openProject(project.xlsm_path);
      });
      await waitFor(() => expect(result.current.project).not.toBeNull());

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
  });
});
