import React, { useRef, useEffect, useState } from 'react';
import { useDrillStore } from '../../store/drillStore';
import { useGraphStore } from '../../store/graphStore';

export default function ClusterTitleOverlay() {
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const phase = useDrillStore((s) => s.phase);
  const setClusterTitleInput = useDrillStore((s) => s.setClusterTitleInput);
  const submitClusterTitle = useDrillStore((s) => s.submitClusterTitle);
  const giveUpClusterTitle = useDrillStore((s) => s.giveUpClusterTitle);
  const startClusterTitle = useDrillStore((s) => s.startClusterTitle);
  const dismiss = useDrillStore((s) => s.dismiss);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const inputRef = useRef<HTMLInputElement>(null);
  const [noMore, setNoMore] = useState(false);

  useEffect(() => {
    if (phase === 'active' && currentDrill?.kind === 'cluster-title') {
      inputRef.current?.focus();
    }
  }, [phase, currentDrill?.kind]);

  if (!currentDrill || currentDrill.kind !== 'cluster-title') return null;
  if (phase !== 'active' && phase !== 'graded') return null;

  const getTitle = (id: string) => nodes.find((n) => n.id === id)?.title ?? id;

  const panelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'var(--panel-bg)',
    border: '1px solid var(--panel-border)',
    borderRadius: 8,
    padding: '12px 16px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    zIndex: 50,
    maxWidth: 480,
    minWidth: 300,
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

  const btnRow: React.CSSProperties = { display: 'flex', gap: 8, marginTop: 4 };

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
    borderColor: 'rgba(192,80,74,0.4)',
  };

  if (phase === 'active') {
    const { childIds, userInput } = currentDrill;
    const childTitles = childIds.map(getTitle).join(', ');
    const canSubmit = userInput.trim().length > 0;

    return (
      <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={labelStyle}>Cluster Title</div>
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
          What concept connects these {childIds.length} nodes?
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{childTitles}</div>
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setClusterTitleInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && canSubmit) void submitClusterTitle();
          }}
          placeholder="Enter the parent concept\u2026"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--panel-border)',
            borderRadius: 5,
            padding: '6px 8px',
            color: 'var(--text)',
            fontSize: 13,
            fontFamily: 'inherit',
            width: '100%',
            boxSizing: 'border-box',
          }}
        />
        <div style={btnRow}>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submitClusterTitle()}
            style={btn(!canSubmit)}
          >
            Submit
          </button>
          <button
            type="button"
            onClick={() => void giveUpClusterTitle()}
            style={cancelBtn}
          >
            Give Up
          </button>
        </div>
      </div>
    );
  }

  // Graded phase
  const { score, gaveUp, parentId, childIds } = currentDrill;
  const parentTitle = getTitle(parentId);

  let verdictText: string;
  let verdictColor: string;
  if (gaveUp) {
    verdictText = 'Skipped. \u22120.10 mastery.';
    verdictColor = '#c0504a';
  } else if (score === 1.0) {
    verdictText = 'Exact match. +0.10 mastery.';
    verdictColor = '#5a7a4a';
  } else if (score === 0.9) {
    verdictText = 'Close (typo or near-miss). +0.05 mastery.';
    verdictColor = '#d4924a';
  } else if (score === 0.7) {
    verdictText = 'Partial match. No change.';
    verdictColor = 'var(--text-muted)';
  } else {
    verdictText = 'Weak/No match. \u22120.10 mastery.';
    verdictColor = '#c0504a';
  }

  return (
    <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
      <div style={labelStyle}>Result</div>
      <div style={{ fontSize: 14, color: verdictColor, fontWeight: 500 }}>
        {verdictText}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        Actual title: <strong style={{ color: 'var(--text)' }}>{parentTitle}</strong>
      </div>
      {noMore && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          No more eligible clusters.
        </div>
      )}
      <div style={btnRow}>
        <button
          type="button"
          onClick={() => {
            setNoMore(false);
            const ok = startClusterTitle(nodes, edges);
            if (!ok) setNoMore(true);
          }}
          style={btn(false)}
        >
          Pick another
        </button>
        <button type="button" onClick={dismiss} style={btn(false)}>
          Done
        </button>
      </div>
    </div>
  );
}
