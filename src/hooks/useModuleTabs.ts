import { useCallback, useEffect, useState } from "react";
import type { ModuleInfo } from "../lib/types";

interface UseModuleTabsOptions {
  activeModule: ModuleInfo | null;
  setActiveModule: (mod: ModuleInfo | null) => void;
}

export function useModuleTabs({ activeModule, setActiveModule }: UseModuleTabsOptions) {
  const [openModules, setOpenModules] = useState<ModuleInfo[]>([]);

  // Ensure the active module always has a corresponding tab.
  // This covers the case where useVerdeProject sets activeModule
  // on project open without going through handleSelectModule.
  useEffect(() => {
    if (activeModule) {
      setOpenModules((prev) =>
        prev.find((m) => m.filename === activeModule.filename) ? prev : [...prev, activeModule]
      );
    }
  }, [activeModule]);

  const handleSelectModule = useCallback(
    (mod: ModuleInfo) => {
      setActiveModule(mod);
      setOpenModules((prev) =>
        prev.find((m) => m.filename === mod.filename) ? prev : [...prev, mod]
      );
    },
    [setActiveModule]
  );

  const handleCloseModule = useCallback(
    (mod: ModuleInfo) => {
      setOpenModules((prev) => {
        const next = prev.filter((m) => m.filename !== mod.filename);
        if (activeModule?.filename === mod.filename) {
          setActiveModule(next[next.length - 1] ?? null);
        }
        return next;
      });
    },
    [activeModule, setActiveModule]
  );

  return { openModules, handleSelectModule, handleCloseModule };
}
