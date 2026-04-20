import { describe, expect, it } from "vitest";
import en from "../locales/en.json";
import ja from "../locales/ja.json";
import { parseBackendError, toI18nKey } from "./error-parse";

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

describe("toI18nKey", () => {
  it("maps projectNotFound to errors.projectNotFound", () => {
    const parsed = parseBackendError("project not found: abc");
    expect(toI18nKey(parsed)).toBe("errors.projectNotFound");
  });

  it("maps projectCorrupted to errors.projectMetadataCorrupted", () => {
    const parsed = parseBackendError("project metadata is corrupted: bad json");
    expect(toI18nKey(parsed)).toBe("errors.projectMetadataCorrupted");
  });

  it("maps locked to lock for existing dialog consumers", () => {
    const parsed = parseBackendError("LOCKED:alice:HOST:2026-04-20T00:00:00Z");
    expect(toI18nKey(parsed)).toBe("lock");
  });

  it("maps excelOpen to status.excelOpen for existing banner consumers", () => {
    const parsed = parseBackendError("EXCEL_OPEN: workbook busy");
    expect(toI18nKey(parsed)).toBe("status.excelOpen");
  });

  it("returns undefined for generic so callers fall back to the raw message", () => {
    const parsed = parseBackendError("something unexpected");
    expect(toI18nKey(parsed)).toBeUndefined();
  });
});

describe("toI18nKey locale contract", () => {
  // ensure every structured key returned by toI18nKey
  // is resolvable to a .title and .message in every locale
  // so missing-key runtime regressions surface at test time.
  const resolve = (obj: unknown, path: string): unknown =>
    path.split(".").reduce<unknown>((acc, k) => {
      if (acc && typeof acc === "object" && k in acc)
        return (acc as Record<string, unknown>)[k];
      return undefined;
    }, obj);

  it("every locale namespace returned by toI18nKey resolves in both en and ja", () => {
    const samples: Array<{ input: string; expectsTitleMessage: boolean }> = [
      { input: "project not found: x", expectsTitleMessage: true },
      {
        input: "project metadata is corrupted: bad",
        expectsTitleMessage: true,
      },
      { input: "LOCKED:u:m:t", expectsTitleMessage: true },
      { input: "EXCEL_OPEN: busy", expectsTitleMessage: false },
    ];

    for (const { input, expectsTitleMessage } of samples) {
      const key = toI18nKey(parseBackendError(input));
      expect(key, `toI18nKey should be defined for input: ${input}`).toBeDefined();
      if (key === undefined) continue;
      for (const [localeName, locale] of [
        ["en", en],
        ["ja", ja],
      ] as const) {
        if (expectsTitleMessage) {
          const title = resolve(locale, `${key}.title`);
          const message = resolve(locale, `${key}.message`);
          expect(
            typeof title,
            `${localeName}:${key}.title should be a string`,
          ).toBe("string");
          expect(title, `${localeName}:${key}.title should be non-empty`).not.toBe(
            "",
          );
          expect(
            typeof message,
            `${localeName}:${key}.message should be a string`,
          ).toBe("string");
          expect(
            message,
            `${localeName}:${key}.message should be non-empty`,
          ).not.toBe("");
        } else {
          const value = resolve(locale, key);
          expect(
            typeof value,
            `${localeName}:${key} should be a flat string leaf`,
          ).toBe("string");
          expect(value, `${localeName}:${key} should be non-empty`).not.toBe("");
        }
      }
    }
  });
});
