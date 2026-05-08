import { useEffect } from 'react';
import { useUserPrefsStore } from '../store/userPrefsStore';

export function useApplyMasteryCssVars(): void {
  const brightness = useUserPrefsStore((s) => s.masteryBrightness);
  const low = useUserPrefsStore((s) => s.masteryLow);
  const mid = useUserPrefsStore((s) => s.masteryMid);
  const high = useUserPrefsStore((s) => s.masteryHigh);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--mastery-brightness', String(brightness));
    root.style.setProperty('--mastery-low', low);
    root.style.setProperty('--mastery-mid', mid);
    root.style.setProperty('--mastery-high', high);
  }, [brightness, low, mid, high]);
}
