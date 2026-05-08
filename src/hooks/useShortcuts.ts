import { useEffect, useMemo } from 'react';
import { buildShortcutRegistry } from '../lib/registerShortcuts';
import { isTypingTarget, type Shortcut } from '../lib/shortcuts';

export function useShortcutRegistry(): Shortcut[] {
  // Built once per mount; identity is stable.
  return useMemo(() => buildShortcutRegistry(), []);
}

export function useShortcuts(): Shortcut[] {
  const registry = useShortcutRegistry();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const typing = isTypingTarget(document.activeElement);
      for (const s of registry) {
        if (typing && !s.allowInInput) continue;
        if (!s.matcher(e)) continue;
        if (s.when && !s.when()) continue;
        s.action(e);
        break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [registry]);
  return registry;
}
