import { useCallback, useState } from "react";
import { type ParsedError } from "../lib/error-parse";

export function useErrorRouting() {
  const [errorBanner, setErrorBanner] = useState<ParsedError | null>(null);
  const [excelOpenPrompt, setExcelOpenPrompt] = useState<string | null>(null);

  // Routes a ParsedError variant to the appropriate UI surface.
  // INVARIANT: `locked` is intentionally dropped here — it carries
  // contextual data (xlsmPath) only the call site knows, and has its
  // own dedicated UI (LockDialog). Each catch site must short-circuit
  // locked into setLockPrompt before delegating residual kinds here.
  const routeParsedError = useCallback((parsed: ParsedError) => {
    switch (parsed.kind) {
      case "locked":
        return;
      case "excelOpen":
        setExcelOpenPrompt(parsed.detail);
        return;
      case "projectNotFound":
      case "projectCorrupted":
      case "generic":
        setErrorBanner(parsed);
        return;
      default: {
        const _exhaustive: never = parsed;
        return _exhaustive;
      }
    }
  }, []);

  return {
    errorBanner,
    setErrorBanner,
    excelOpenPrompt,
    setExcelOpenPrompt,
    routeParsedError,
  };
}
