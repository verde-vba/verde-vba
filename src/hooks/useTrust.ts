import { useEffect, useState } from "react";
import { getSettings, saveSettings } from "../lib/tauri-commands";

/// Hook for the VBA-trust first-launch acknowledgement.
///
/// Returns `acknowledged === null` while settings are still loading so
/// the UI can suppress TrustGuideDialog until we know the real value —
/// otherwise every startup would flash the dialog for a tick before
/// hiding it for users who already acknowledged.
export function useTrust() {
  const [acknowledged, setAcknowledged] = useState<boolean | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => setAcknowledged(s.trust?.vbaAcknowledged ?? false))
      .catch(() => setAcknowledged(false));
  }, []);

  const acknowledge = async () => {
    // Optimistic: flip UI immediately so the dialog closes without
    // waiting on IPC; persistence happens in the background.
    setAcknowledged(true);
    try {
      const current = await getSettings();
      await saveSettings({ ...current, trust: { vbaAcknowledged: true } });
    } catch (e) {
      console.error("Failed to persist trust acknowledgement:", e);
    }
  };

  return { acknowledged, acknowledge };
}
