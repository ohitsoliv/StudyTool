import { useEffect, useMemo, useState } from 'react';
import { useGraphStore } from '../../store/graphStore';
import { useSessionStore } from '../../store/sessionStore';
import { useUserPrefsStore } from '../../store/userPrefsStore';
import type { SessionConfig, SessionMode } from '../../types/session';

const inputStyle: React.CSSProperties = {
  background: '#0d0d0f',
  color: 'var(--text)',
  border: '1px solid var(--panel-border)',
  borderRadius: 4,
  padding: '6px 8px',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
};

export default function SessionModal(): JSX.Element | null {
  const open = useSessionStore((s) => s.modalOpen);
  const close = useSessionStore((s) => s.closeModal);
  const startSession = useSessionStore((s) => s.startSession);
  const defaultMode = useUserPrefsStore((s) => s.defaultSessionMode);
  const nodes = useGraphStore((s) => s.nodes);

  const [mode, setMode] = useState<SessionMode>(defaultMode);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [tag, setTag] = useState<string>('');
  const [drillCount, setDrillCount] = useState<number>(20);

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setDurationMinutes(15);
    setTag('');
    setDrillCount(20);
  }, [open, defaultMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const knownTags = useMemo(() => {
    const set = new Set<string>();
    for (const node of nodes) {
      for (const t of node.tags) {
        const trimmed = t.trim();
        if (trimmed) set.add(trimmed);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [nodes]);

  if (!open) return null;

  const onStart = () => {
    let config: SessionConfig;
    if (mode === 'open') {
      config = {
        mode: 'open',
        durationMinutes: Math.max(1, durationMinutes),
      };
    } else if (mode === 'class-study') {
      config = {
        mode: 'class-study',
        tag: tag.trim(),
        durationMinutes: durationMinutes > 0 ? durationMinutes : null,
      };
    } else {
      config = {
        mode: 'exam-prep',
        drillCount: Math.max(1, drillCount),
        durationMinutes: durationMinutes > 0 ? durationMinutes : null,
      };
    }
    startSession(config);
  };

  return (
    <div
      role="dialog"
      aria-label="Start session"
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--panel-bg)',
          color: 'var(--text)',
          border: '1px solid var(--panel-border)',
          borderRadius: 8,
          padding: 20,
          width: 460,
          maxWidth: '92vw',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Start a session</h2>
          <button
            onClick={close}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 18,
            }}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Mode
        </div>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as SessionMode)}
          style={{ ...inputStyle, marginBottom: 12 }}
        >
          <option value="open">Open</option>
          <option value="class-study">Class Study</option>
          <option value="exam-prep">Exam Prep</option>
        </select>

        {mode === 'class-study' && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Tag (for class pool)
            </div>
            <input
              list="session-tag-options"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Type a tag"
              style={{ ...inputStyle, marginBottom: 12 }}
            />
            <datalist id="session-tag-options">
              {knownTags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </>
        )}

        {mode === 'exam-prep' && (
          <>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
              Drill count
            </div>
            <input
              type="number"
              min={1}
              value={drillCount}
              onChange={(e) => setDrillCount(Number(e.target.value) || 1)}
              style={{ ...inputStyle, marginBottom: 12 }}
            />
          </>
        )}

        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
          Duration minutes ({mode === 'open' ? 'required' : '0 for no timer'})
        </div>
        <input
          type="number"
          min={mode === 'open' ? 1 : 0}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
          style={inputStyle}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={close}
            style={{
              background: 'transparent',
              color: 'var(--text)',
              border: '1px solid var(--panel-border)',
              borderRadius: 6,
              padding: '8px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onStart}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: '1px solid var(--accent)',
              borderRadius: 6,
              padding: '8px 12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontWeight: 600,
            }}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
