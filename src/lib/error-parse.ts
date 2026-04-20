/**
 * Structured representation of an error returned by the Tauri backend.
 *
 * The backend uses string-prefix conventions (rather than typed events) to
 * communicate distinct failure modes, so we centralize parsing here to keep
 * the UI layer free of regex/string-prefix logic.
 */
export type ParsedError =
  | { kind: "locked"; user: string; machine: string; time: string }
  | { kind: "excelOpen"; detail: string }
  | { kind: "projectNotFound"; detail: string }
  | { kind: "projectCorrupted"; detail: string }
  | { kind: "generic"; message: string };

export function parseBackendError(raw: unknown): ParsedError {
  const msg = raw instanceof Error ? raw.message : String(raw);
  const locked = /^LOCKED:([^:]*):([^:]*):(.+)$/.exec(msg);
  if (locked) {
    return {
      kind: "locked",
      user: locked[1],
      machine: locked[2],
      time: locked[3],
    };
  }
  if (msg.startsWith("EXCEL_OPEN:")) {
    return { kind: "excelOpen", detail: msg.slice("EXCEL_OPEN:".length) };
  }
  if (msg.startsWith("project metadata is corrupted:")) {
    return {
      kind: "projectCorrupted",
      detail: msg.slice("project metadata is corrupted:".length),
    };
  }
  if (msg.startsWith("project not found:")) {
    return {
      kind: "projectNotFound",
      detail: msg.slice("project not found:".length),
    };
  }
  return { kind: "generic", message: msg };
}

/**
 * Map a ParsedError variant to the top-level i18n namespace key used by the
 * UI. Callers append `.title` / `.message` themselves. Returns `undefined`
 * for `generic` to signal "no structured key — fall back to the raw message".
 *
 * The exhaustive `switch` with a `never` default is deliberate: it makes this
 * function the single place that enforces "every kind has a mapping", so
 * adding a new variant to `ParsedError` surfaces a type error here rather
 * than silently falling through at scattered call sites.
 */
export function toI18nKey(parsed: ParsedError): string | undefined {
  switch (parsed.kind) {
    case "locked":
      return "lock";
    case "excelOpen":
      return "status.excelOpen";
    case "projectNotFound":
      return "errors.projectNotFound";
    case "projectCorrupted":
      return "errors.projectMetadataCorrupted";
    case "generic":
      return undefined;
    default: {
      const _exhaustive: never = parsed;
      return _exhaustive;
    }
  }
}
