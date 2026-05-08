import { useEffect, useState } from 'react';
import { useSessionStore } from '../../store/sessionStore';

function formatRemaining(deadlineAt: number | null, now: number): string {
  if (deadlineAt === null) return 'No timer';
  const ms = Math.max(0, deadlineAt - now);
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')} remaining`;
}

export default function SessionBanner(): JSX.Element | null {
  const session = useSessionStore((s) => s.session);
  const endSession = useSessionStore((s) => s.endSession);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!session) return null;

  const classPoolEmpty =
    session.config.mode === 'class-study' &&
    session.poolNodeIds !== null &&
    session.poolNodeIds.size === 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 880,
        border: '1px solid var(--panel-border)',
        background: 'var(--panel-bg)',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Study Session
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)' }}>
            {session.config.mode} · {session.drillsCompleted}
            {session.drillsTarget !== null ? ` / ${session.drillsTarget}` : ''} drills · {formatRemaining(session.deadlineAt, now)}
          </div>
          {session.boundReached && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Session bound reached. Finish here or end session.
            </div>
          )}
          {classPoolEmpty && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Class Study pool is empty for this tag. End session or start another with a different tag.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={endSession}
          style={{
            background: 'transparent',
            color: 'var(--text)',
            border: '1px solid var(--panel-border)',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >
          End session
        </button>
      </div>
    </div>
  );
}
