import { describe, expect, it } from "vitest";
import { parseBackendError } from "./error-parse";

describe("parseBackendError", () => {
  it("parses a LOCKED error into structured fields", () => {
    const result = parseBackendError(
      "LOCKED:tanaka:DESKTOP-ABC:2026-04-19T10:30:00Z",
    );
    expect(result).toEqual({
      kind: "locked",
      user: "tanaka",
      machine: "DESKTOP-ABC",
      time: "2026-04-19T10:30:00Z",
    });
  });

  it("parses an EXCEL_OPEN error, preserving the detail suffix", () => {
    const result = parseBackendError("EXCEL_OPEN: workbook is open");
    expect(result).toEqual({
      kind: "excelOpen",
      detail: " workbook is open",
    });
  });

  it("falls back to generic for unrecognized messages", () => {
    const result = parseBackendError("some other error");
    expect(result).toEqual({
      kind: "generic",
      message: "some other error",
    });
  });

  it("unwraps Error instances before parsing", () => {
    const result = parseBackendError(
      new Error("LOCKED:alice:HOST:2026-04-20T00:00:00Z"),
    );
    expect(result).toEqual({
      kind: "locked",
      user: "alice",
      machine: "HOST",
      time: "2026-04-20T00:00:00Z",
    });
  });

  it("treats malformed LOCKED payloads (missing fields) as generic", () => {
    const result = parseBackendError("LOCKED:");
    expect(result).toEqual({
      kind: "generic",
      message: "LOCKED:",
    });
  });

  it("stringifies undefined inputs", () => {
    const result = parseBackendError(undefined);
    expect(result).toEqual({
      kind: "generic",
      message: "undefined",
    });
  });

  it("parses a project-not-found error, preserving the detail suffix", () => {
    const result = parseBackendError("project not found: abc123def456");
    expect(result).toEqual({
      kind: "projectNotFound",
      detail: " abc123def456",
    });
  });

  it("parses a project-metadata-corrupted error, preserving the parse-error cause", () => {
    const result = parseBackendError(
      "project metadata is corrupted: expected value at line 1 column 1",
    );
    expect(result).toEqual({
      kind: "projectCorrupted",
      detail: " expected value at line 1 column 1",
    });
  });

  it("unwraps Error instances when parsing project-not-found", () => {
    const result = parseBackendError(new Error("project not found: xyz"));
    expect(result).toEqual({
      kind: "projectNotFound",
      detail: " xyz",
    });
  });

  it("treats messages mentioning 'project not found' mid-string as generic, not projectNotFound", () => {
    const input = "unexpected: project not found somewhere in the middle";
    const result = parseBackendError(input);
    expect(result).toEqual({
      kind: "generic",
      message: input,
    });
  });
});
