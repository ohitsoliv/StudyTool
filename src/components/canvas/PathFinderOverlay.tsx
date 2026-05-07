import React, { useState } from 'react';
import { useDrillStore } from '../../store/drillStore';
import { useGraphStore } from '../../store/graphStore';

function truncTitle(s: string, max = 24): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export default function PathFinderOverlay() {
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const phase = useDrillStore((s) => s.phase);
  const clickPathStep = useDrillStore((s) => s.clickPathStep);
  const giveUp = useDrillStore((s) => s.giveUp);
  const dismiss = useDrillStore((s) => s.dismiss);
  const nodes = useGraphStore((s) => s.nodes);
  const [noMorePairs, setNoMorePairs] = useState(false);

  const startPathFinder = useDrillStore((s) => s.startPathFinder);
  const result = useDrillStore((s) => s.result);

  // Only render for path-finder drills
  if (!currentDrill || currentDrill.kind !== 'path-finder') return null;
  if (phase !== 'active' && phase !== 'graded') return null;

  const getTitle = (id: string) =>
    truncTitle(nodes.find((n) => n.id === id)?.title ?? id);

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: 8,
    padding: '12px 16px',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
    zIndex: 50,
    maxWidth: 480,
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'all',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  const routeStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text)',
  };

  const crumbStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const btnRow: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  };

  const btn = (disabled = false): React.CSSProperties => ({
    flex: 1,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--panel-border)',
    background: 'transparent',
    color: disabled ? 'var(--text-muted)' : 'var(--text)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 13,
    fontFamily: 'inherit',
    opacity: disabled ? 0.5 : 1,
  });

  const cancelBtn: React.CSSProperties = {
    ...btn(false),
    color: '#c0504a',
    borderColor: 'rgba(192, 80, 74, 0.4)',
  };

  // ── Active phase ──────────────────────────────────────────────────────────
  if (phase === 'active') {
    const { startNodeId, endNodeId, userPath } = currentDrill;

    // Breadcrumb: source → [steps] → ? → target
    const crumbParts: string[] = [getTitle(startNodeId)];
    for (const id of userPath) {
      if (id !== endNodeId) crumbParts.push(getTitle(id));
    }
    crumbParts.push('?');

    const canUndo = userPath.length > 0 && !currentDrill.finished;
    const canSubmit = currentDrill.finished;

    const handleUndo = () => {
      if (currentDrill.kind !== 'path-finder') return;
      // Remove last step by re-calling store action for undo
      const newPath = currentDrill.userPath.slice(0, -1);
      // drillStore doesn't expose removeLastPathStep yet — call via getState
      useDrillStore.setState((s) => {
        if (!s.currentDrill || s.currentDrill.kind !== 'path-finder') return s;
        return {
          currentDrill: {
            ...s.currentDrill,
            userPath: newPath,
            finished: false,
          },
        };
      });
    };

    return (
      <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={labelStyle}>Path Finder</div>
        <div style={routeStyle}>
          {getTitle(startNodeId)} → {getTitle(endNodeId)}
        </div>
        <div style={crumbStyle}>{crumbParts.join(' → ')}</div>
        <div style={btnRow}>
          <button style={btn(!canUndo)} disabled={!canUndo} onClick={handleUndo}>
            Undo last
          </button>
          <button
            style={btn(!canSubmit)}
            disabled={!canSubmit}
            onClick={() => {
              const drill = useDrillStore.getState().currentDrill;
              if (drill?.kind === 'path-finder' && drill.finished) {
                useDrillStore.getState().submit();
              }
            }}
          >
            Submit
          </button>
          <button style={cancelBtn} onClick={() => giveUp()}>
            Give Up
          </button>
        </div>
      </div>
    );
  }

  // ── Graded phase ──────────────────────────────────────────────────────────
  if (phase === 'graded' && result && result.drill.kind === 'path-finder') {
    const gradedDrill = result.drill;
    const { startNodeId, endNodeId, userPath } = gradedDrill;
    const reachedEnd = result.reachedEnd ?? false;
    const hops =
      (result.validSteps ?? 0) - (result.shortestPathLength ?? result.validSteps ?? 0);
    const clampedHops = Math.max(0, hops);

    let verdictText: string;
    let verdictColor: string;
    if (!reachedEnd) {
      verdictText = 'Gave up. −0.10 mastery.';
      verdictColor = '#c0504a';
    } else if (clampedHops === 0) {
      verdictText = 'Shortest path. +0.10 mastery.';
      verdictColor = '#5cb87a';
    } else if (clampedHops === 1) {
      verdictText = 'Valid path, one hop longer than shortest. +0.05 mastery.';
      verdictColor = '#d4924a';
    } else if (clampedHops === 2) {
      verdictText = 'Valid path, two hops longer. No mastery change.';
      verdictColor = 'var(--text-muted)';
    } else {
      verdictText = 'Invalid or too long. −0.10 mastery.';
      verdictColor = '#c0504a';
    }

    const userFullPath = [startNodeId, ...userPath];
    const shortestLen = result.shortestPathLength ?? 0;
    const showShortest = reachedEnd && clampedHops > 0;

    const handlePickAnother = () => {
      setNoMorePairs(false);
      const ok = startPathFinder();
      if (!ok) setNoMorePairs(true);
    };

    return (
      <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={labelStyle}>Result</div>
        <div style={{ fontSize: 14, color: verdictColor, fontWeight: 500 }}>
          {verdictText}
        </div>
        <div style={crumbStyle}>
          {userFullPath.map((id) => getTitle(id)).join(' → ')}
        </div>
        {showShortest && (
          <div style={{ ...crumbStyle, fontSize: 11 }}>
            Shortest path: {shortestLen} hop{shortestLen !== 1 ? 's' : ''}
          </div>
        )}
        {noMorePairs && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            No more eligible pairs.
          </div>
        )}
        <div style={btnRow}>
          <button style={btn(false)} onClick={handlePickAnother}>
            Pick another
          </button>
          <button style={cancelBtn} onClick={() => dismiss()}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
