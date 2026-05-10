// src/components/canvas/BridgeOverlay.tsx
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
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export function BridgeOverlay() {
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const phase = useDrillStore((s) => s.phase);
  const setBridgeType = useDrillStore((s) => s.setBridgeType);
  const setBridgeLabel = useDrillStore((s) => s.setBridgeLabel);
  const submitBridge = useDrillStore((s) => s.submitBridge);
  const cancelBridge = useDrillStore((s) => s.cancelBridge);
  const startBridge = useDrillStore((s) => s.startBridge);
  const dismiss = useDrillStore((s) => s.dismiss);
  const nodes = useGraphStore((s) => s.nodes);
  const [noMore, setNoMore] = useState(false);

  if (!currentDrill || currentDrill.kind !== 'bridge') return null;
  if (phase !== 'active' && phase !== 'graded') return null;

  const getTitle = (id: string | null): string =>
    id ? truncTitle(nodes.find((n) => n.id === id)?.title ?? id) : '';

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
    const { aId, bId, chosenType, label } = currentDrill;
    const bothPicked = aId !== null && bId !== null;
    const trimmed = label.trim();
    const canSubmit = bothPicked && chosenType !== null && trimmed.length >= 5;

    let subtitle: React.ReactNode;
    if (aId === null) {
      subtitle = (
        <div style={{ fontSize: 14, color: 'var(--text)' }}>
          Click a node on the canvas to pick the first endpoint.
        </div>
      );
    } else if (bId === null) {
      subtitle = (
        <div style={{ fontSize: 14, color: 'var(--text)' }}>
          Picked: <strong>{getTitle(aId)}</strong>. Click another node for the second endpoint.
        </div>
      );
    } else {
      subtitle = (
        <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
          {getTitle(aId)} → {getTitle(bId)}
        </div>
      );
    }

    return (
      <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
        <div style={labelStyle}>Bridge</div>
        {subtitle}

        {bothPicked && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EDGE_TYPES.map(({ type, label: typeLabel, color, dashed }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBridgeType(type)}
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
                  <span
                    style={{
                      display: 'inline-block',
                      width: 20,
                      height: 2,
                      background: dashed ? 'none' : color,
                      borderTop: dashed ? `2px dashed ${color}` : 'none',
                      borderRadius: dashed ? 0 : 1,
                      flexShrink: 0,
                    }}
                  />
                  {typeLabel}
                </button>
              ))}
            </div>

            <div>
              <input
                type="text"
                value={label}
                onChange={(e) => setBridgeLabel(e.target.value)}
                placeholder="One-line label for this connection…"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--panel-border)',
                  borderRadius: 5,
                  padding: '6px 8px',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
              {trimmed.length > 0 && trimmed.length < 5 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {5 - trimmed.length} more characters needed
                </div>
              )}
            </div>
          </>
        )}

        <div style={btnRow}>
          {bothPicked && (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void submitBridge()}
              style={btn(!canSubmit)}
            >
              Submit
            </button>
          )}
          <button type="button" onClick={cancelBridge} style={cancelBtn}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Graded phase
  const { aId, bId, chosenType, label, outcome } = currentDrill;
  if (outcome !== 'created') return null;

  return (
    <div style={panelStyle} onMouseDown={(e) => e.stopPropagation()}>
      <div style={labelStyle}>Result</div>
      <div style={{ fontSize: 14, color: '#5a7a4a', fontWeight: 500 }}>
        Connection created: {getTitle(aId)} —[{chosenType}]→ {getTitle(bId)}. +0.05 mastery.
      </div>
      {label && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          “{label}”
        </div>
      )}
      {noMore && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Need ≥ 2 nodes to bridge.
        </div>
      )}
      <div style={btnRow}>
        <button
          type="button"
          onClick={() => {
            setNoMore(false);
            const ok = startBridge();
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

export default BridgeOverlay;