import React, { useState } from 'react';
import { useDrillStore } from '../../store/drillStore';
import { useGraphStore } from '../../store/graphStore';

const COLOR_OK = '#5cb87a';

const primaryBtnStyle: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '10px 24px',
  cursor: 'pointer',
  fontSize: 15,
  fontWeight: 500,
  fontFamily: 'inherit',
};

const secondaryBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--panel-border)',
};

export function StubFillDrill() {
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const phase = useDrillStore((s) => s.phase);
  const result = useDrillStore((s) => s.result);
  const setStubFillInput = useDrillStore((s) => s.setStubFillInput);
  const submitStubFill = useDrillStore((s) => s.submitStubFill);
  const cancelStubFill = useDrillStore((s) => s.cancelStubFill);
  const startStubFill = useDrillStore((s) => s.startStubFill);
  const dismiss = useDrillStore((s) => s.dismiss);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const [noMore, setNoMore] = useState(false);

  const activeDrill =
    phase === 'active' && currentDrill?.kind === 'stub-fill' ? currentDrill : null;
  const gradedDrill =
    phase === 'graded' && result?.drill.kind === 'stub-fill' ? result.drill : null;

  if (activeDrill) {
    const node = nodes.find((n) => n.id === activeDrill.nodeId);
    const nodeTitle = node?.title ?? '(missing)';
    const layer1 = node?.layers?.[0];
    const currentLayer1Text =
      layer1 && layer1.contentType === 'text' && typeof layer1.content === 'string'
        ? layer1.content
        : '';

    const neighborSet = new Set<string>();
    for (const e of edges) {
      if (e.source === activeDrill.nodeId) neighborSet.add(e.target);
      if (e.target === activeDrill.nodeId) neighborSet.add(e.source);
    }
    const neighborIds = Array.from(neighborSet);

    const trimmed = activeDrill.userInput.trim();
    const canSubmit = trimmed.length >= 10;

    return (
      <div style={{ maxWidth: 640, width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}
          >
            Fill this stub
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{nodeTitle}</div>
        </div>

        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: 6,
            padding: '8px 12px',
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: 12,
            whiteSpace: 'pre-wrap',
            fontStyle: currentLayer1Text.trim().length === 0 ? 'italic' : 'normal',
          }}
        >
          {currentLayer1Text.trim().length > 0
            ? currentLayer1Text
            : 'Layer 1 is currently empty.'}
        </div>

        {neighborIds.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
              Connected neighbors
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {neighborIds.map((id) => {
                const neighbor = nodes.find((n) => n.id === id);
                if (!neighbor) return null;
                return (
                  <span
                    key={id}
                    style={{
                      fontSize: 12,
                      border: '1px solid var(--panel-border)',
                      borderRadius: 999,
                      padding: '3px 10px',
                      color: 'var(--text)',
                      background: 'var(--panel-bg)',
                    }}
                  >
                    {neighbor.title}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <textarea
          id="stub-fill-drill-input"
          name="stubFillDrillInput"
          value={activeDrill.userInput}
          onChange={(e) => setStubFillInput(e.target.value)}
          autoFocus
          rows={5}
          style={{
            width: '100%',
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderRadius: 6,
            color: 'var(--text)',
            fontSize: 14,
            padding: '10px 12px',
            resize: 'vertical',
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 4,
            marginBottom: 16,
          }}
        >
          {trimmed.length} / 10 minimum
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => void submitStubFill()}
            disabled={!canSubmit}
            style={{
              ...primaryBtnStyle,
              opacity: canSubmit ? 1 : 0.45,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            Submit
          </button>
          <button type="button" onClick={cancelStubFill} style={secondaryBtnStyle}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (gradedDrill) {
    const targetNode = nodes.find((n) => n.id === gradedDrill.nodeId);
    const targetTitle = targetNode?.title ?? '(missing)';

    return (
      <div style={{ maxWidth: 600, width: '100%', margin: '0 auto' }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: COLOR_OK,
            marginBottom: 8,
          }}
        >
          Stub filled.
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
          +0.05 mastery on{' '}
          <strong style={{ color: 'var(--text)' }}>{targetTitle}</strong>.
        </div>
        <div
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--panel-border)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: 14,
            color: 'var(--text)',
            marginBottom: 20,
            fontStyle: 'italic',
            whiteSpace: 'pre-wrap',
          }}
        >
          {gradedDrill.userInput}
        </div>
        {noMore && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginBottom: 12,
            }}
          >
            No empty nodes available.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setNoMore(false);
              const ok = startStubFill();
              if (!ok) setNoMore(true);
            }}
            style={primaryBtnStyle}
          >
            Pick another
          </button>
          <button type="button" onClick={dismiss} style={secondaryBtnStyle}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default StubFillDrill;