import React, { useState } from 'react';
import { useDrillStore } from '../../store/drillStore';
import { useGraphStore } from '../../store/graphStore';
import type { EdgeType } from '../../types/graph';

const EDGE_TYPES: { type: EdgeType; label: string; color: string; dashed: boolean }[] = [
  { type: 'parent-child', label: 'Parent → Child', color: '#9a9a9f', dashed: false },
  { type: 'prerequisite', label: 'Prerequisite', color: '#d4924a', dashed: true },
  { type: 'related', label: 'Related', color: '#6b8afd', dashed: false },
  { type: 'sequence', label: 'Sequence', color: '#5a7a4a', dashed: false },
];

function truncTitle(s: string, max = 24): string {
  return s.length > max ? s.slice(0, max) + '\u2026' : s;
}

export default function MissingLinkOverlay() {
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const phase = useDrillStore((s) => s.phase);
  const setMissingLinkType = useDrillStore((s) => s.setMissingLinkType);
  const setMissingLinkJustification = useDrillStore((s) => s.setMissingLinkJustification);
  const submitMissingLink = useDrillStore((s) => s.submitMissingLink);
  const giveUpMissingLink = useDrillStore((s) => s.giveUpMissingLink);
  const startMissingLink = useDrillStore((s) => s.startMissingLink);
  const dismiss = useDrillStore((s) => s.dismiss);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const [noMore, setNoMore] = useState(false);

  if (!currentDrill || currentDrill.kind !== 'missing-link') return null;
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
    const { aId, bId, chosenType, justification } = currentDrill;
    const canSubmit = chosenType !== null && justification.trim().length >= 10;
    return (
      <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={labelStyle}>Missing Link</div>
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
          Connect <strong>{getTitle(aId)}</strong> and <strong>{getTitle(bId)}</strong>.
          What&apos;s the relationship?
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {EDGE_TYPES.map(({ type, label, color, dashed }) => (
            <button
              key={type}
              type="button"
              onClick={() => setMissingLinkType(type)}
              style={{
                padding: '4px 10px',
                borderRadius: 5,
                border: `1px solid ${color}`,
                background: chosenType === type ? `${color}33` : 'transparent',
                color: color,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: 'inherit',
                fontWeight: chosenType === type ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 20,
                height: 2,
                background: dashed ? 'none' : color,
                borderTop: dashed ? `2px dashed ${color}` : 'none',
                borderRadius: dashed ? 0 : 1,
                flexShrink: 0,
              }} />
              {label}
            </button>
          ))}
        </div>

        <div>
          <textarea
            rows={2}
            value={justification}
            onChange={(e) => setMissingLinkJustification(e.target.value)}
            placeholder="One sentence explaining why these connect\u2026"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--panel-border)',
              borderRadius: 5,
              padding: '6px 8px',
              color: 'var(--text)',
              fontSize: 13,
              fontFamily: 'inherit',
              resize: 'none',
              boxSizing: 'border-box',
            }}
          />
          {justification.trim().length < 10 && justification.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {10 - justification.trim().length} more characters needed
            </div>
          )}
        </div>

        <div style={btnRow}>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submitMissingLink()}
            style={btn(!canSubmit)}
          >
            Submit
          </button>
          <button
            type="button"
            onClick={() => void giveUpMissingLink()}
            style={cancelBtn}
          >
            Give Up
          </button>
        </div>
      </div>
    );
  }

  // Graded phase
  const { outcome, chosenType, justification, aId, bId } = currentDrill;
  const passed = outcome === 'passed';
  const verdictColor = passed ? '#5a7a4a' : '#c0504a';
  const aTitle = getTitle(aId);
  const bTitle = getTitle(bId);

  return (
    <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
      <div style={labelStyle}>Result</div>
      <div style={{ fontSize: 14, color: verdictColor, fontWeight: 500 }}>
        {passed
          ? `Connection created: ${aTitle} \u2014[${chosenType}]\u2192 ${bTitle}. +0.10 mastery.`
          : 'Skipped. \u22120.10 mastery.'}
      </div>
      {passed && justification && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          &ldquo;{justification}&rdquo;
        </div>
      )}
      {noMore && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          No more eligible pairs.
        </div>
      )}
      <div style={btnRow}>
        <button
          type="button"
          onClick={() => {
            setNoMore(false);
            const ok = startMissingLink(nodes, edges);
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
