import { useCallback, useState } from "react";

type Side = "verde" | "excel";

export interface UseConflictResolverOptions {
  resolveConflict: (side: Side) => Promise<void>;
  resolveConflictPerModule: (decisions: Record<string, Side>) => Promise<void>;
}

export interface UseConflictResolverResult {
  resolving: boolean;
  error: string | null;
  keepVerde: () => Promise<void>;
  keepExcel: () => Promise<void>;
  perModule: (decisions: Record<string, Side>) => Promise<void>;
}

/**
 * Wraps the three conflict-resolution branches with shared loading-state
 * and error-message bookkeeping. Keeping the try/finally in one place
 * removes triplicated boilerplate from the parent component.
 */
export function useConflictResolver({
  resolveConflict,
  resolveConflictPerModule,
}: UseConflictResolverOptions): UseConflictResolverResult {
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setResolving(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResolving(false);
    }
  }, []);

  const keepVerde = useCallback(
    () => run(() => resolveConflict("verde")),
    [run, resolveConflict],
  );
  const keepExcel = useCallback(
    () => run(() => resolveConflict("excel")),
    [run, resolveConflict],
  );
  const perModule = useCallback(
    (decisions: Record<string, Side>) =>
      run(() => resolveConflictPerModule(decisions)),
    [run, resolveConflictPerModule],
  );

  return { resolving, error, keepVerde, keepExcel, perModule };
}
