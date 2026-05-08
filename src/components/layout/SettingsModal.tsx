import { useEffect } from 'react';
import { useUserPrefsStore, type SessionMode } from '../../store/userPrefsStore';
import type { EdgeType } from '../../types/graph';

const EDGE_TYPES: EdgeType[] = ['parent-child', 'related', 'prerequisite', 'sequence'];
const SESSION_MODES: { value: SessionMode; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'class-study', label: 'Class Study' },
  { value: 'exam-prep', label: 'Exam Prep' },
];

const sectionLabel: React.CSSProperties = {
  fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)',
  letterSpacing: 0.5, marginBottom: 8, marginTop: 18,
};
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '6px 0', fontSize: 13,
};
const inputStyle: React.CSSProperties = {
  background: '#0d0d0f', color: 'var(--text)', border: '1px solid var(--panel-border)',
  borderRadius: 4, padding: '4px 8px', fontSize: 13, width: 180,
};
const colorInputStyle: React.CSSProperties = {
  width: 32, height: 24, border: '1px solid var(--panel-border)', borderRadius: 4,
  background: 'transparent', cursor: 'pointer',
};

export default function SettingsModal() {
  const open = useUserPrefsStore((s) => s.settingsOpen);
  const close = useUserPrefsStore((s) => s.closeSettings);
  const p = useUserPrefsStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-label="Settings"
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
          padding: 24, width: 520, maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Settings</h2>
          <button onClick={close} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: 18 }} aria-label="Close">×</button>
        </div>

        <div style={sectionLabel}>Appearance</div>
        <div style={row}>
          <span>Mastery brightness</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="range" min={0.5} max={1.5} step={0.05}
              value={p.masteryBrightness}
              onChange={(e) => p.setMasteryBrightness(parseFloat(e.target.value))}
              style={{ width: 140 }}
            />
            <span style={{ width: 32, textAlign: 'right', color: 'var(--text-muted)', fontSize: 12 }}>
              {p.masteryBrightness.toFixed(2)}
            </span>
          </div>
        </div>
        <div style={row}>
          <span>Mastery low (0.0)</span>
          <input type="color" value={p.masteryLow} onChange={(e) => p.setMasteryLow(e.target.value)} style={colorInputStyle} />
        </div>
        <div style={row}>
          <span>Mastery mid (0.5)</span>
          <input type="color" value={p.masteryMid} onChange={(e) => p.setMasteryMid(e.target.value)} style={colorInputStyle} />
        </div>
        <div style={row}>
          <span>Mastery high (1.0)</span>
          <input type="color" value={p.masteryHigh} onChange={(e) => p.setMasteryHigh(e.target.value)} style={colorInputStyle} />
        </div>

        <div style={sectionLabel}>Sidebar &amp; Indicators</div>
        <div style={row}>
          <span>Hide Sidebar Drills section</span>
          <input type="checkbox" checked={p.hideSidebarDrills} onChange={(e) => p.setHideSidebarDrills(e.target.checked)} />
        </div>
        <div style={row}>
          <span>Show recommended-lens indicator</span>
          <input type="checkbox" checked={p.showRecommendedLensIndicator} onChange={(e) => p.setShowRecommendedLensIndicator(e.target.checked)} />
        </div>

        <div style={sectionLabel}>Sessions</div>
        <div style={row}>
          <span>Default session mode</span>
          <select
            value={p.defaultSessionMode}
            onChange={(e) => p.setDefaultSessionMode(e.target.value as SessionMode)}
            style={inputStyle}
          >
            {SESSION_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div style={sectionLabel}>Lens display names</div>
        <div style={row}>
          <span>Memorizer</span>
          <input style={inputStyle} value={p.lensNameMemorizer} onChange={(e) => p.setLensName('memorizer', e.target.value)} />
        </div>
        <div style={row}>
          <span>Architect</span>
          <input style={inputStyle} value={p.lensNameArchitect} onChange={(e) => p.setLensName('architect', e.target.value)} />
        </div>
        <div style={row}>
          <span>Practitioner</span>
          <input style={inputStyle} value={p.lensNamePractitioner} onChange={(e) => p.setLensName('practitioner', e.target.value)} />
        </div>

        <div style={sectionLabel}>Edge nicknames</div>
        {EDGE_TYPES.map((t) => (
          <div key={t} style={row}>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t}</span>
            <input
              style={inputStyle}
              value={p.getEdgeNickname(t)}
              onChange={(e) => p.setEdgeNickname(t, e.target.value)}
            />
          </div>
        ))}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => p.resetToDefaults()}
            style={{
              background: 'transparent', color: 'var(--text-muted)',
              border: '1px solid var(--panel-border)', borderRadius: 4,
              padding: '6px 12px', cursor: 'pointer', fontSize: 12,
            }}
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
