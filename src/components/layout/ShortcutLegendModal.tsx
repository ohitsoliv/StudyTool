import { useEffect } from 'react';
import { useUserPrefsStore } from '../../store/userPrefsStore';
import { useShortcutRegistry } from '../../hooks/useShortcuts';
import type { Shortcut, ShortcutGroup } from '../../lib/shortcuts';

const GROUP_ORDER: ShortcutGroup[] = ['view', 'navigation', 'drill', 'edit', 'help'];
const GROUP_LABEL: Record<ShortcutGroup, string> = {
  view: 'View',
  navigation: 'Navigation',
  drill: 'Drills',
  edit: 'Edit',
  help: 'Help',
};

export default function ShortcutLegendModal() {
  const open = useUserPrefsStore((s) => s.legendOpen);
  const close = useUserPrefsStore((s) => s.closeLegend);
  const registry = useShortcutRegistry();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const grouped: Record<ShortcutGroup, Shortcut[]> = {
    view: [], navigation: [], drill: [], edit: [], help: [],
  };
  for (const s of registry) grouped[s.group].push(s);

  return (
    <div
      role="dialog"
      aria-label="Keyboard shortcuts"
      onClick={close}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--panel-bg)', color: 'var(--text)',
          border: '1px solid var(--panel-border)', borderRadius: 8,
          padding: 24, minWidth: 420, maxWidth: 560, maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Keyboard shortcuts</h2>
          <button
            onClick={close}
            style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 18 }}
            aria-label="Close"
          >×</button>
        </div>
        {GROUP_ORDER.map((g) => grouped[g].length === 0 ? null : (
          <div key={g} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 6 }}>
              {GROUP_LABEL[g]}
            </div>
            {grouped[g].map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span>{s.label}</span>
                <kbd style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 12,
                  background: '#0d0d0f', border: '1px solid var(--panel-border)', borderRadius: 4,
                  padding: '2px 6px', color: 'var(--text)',
                }}>{s.keys}</kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
