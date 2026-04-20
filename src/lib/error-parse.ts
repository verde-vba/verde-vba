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
  return { kind: "generic", message: msg };
}
