// src/components/workspace/ExampleDrill.tsx
import React, { useState } from 'react';
import { useDrillStore } from '../../store/drillStore';
import { useGraphStore } from '../../store/graphStore';

const COLOR_OK = '#5cb87a';
const PREVIEW_CHARS = 240;

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

export function ExampleDrill() {
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const phase = useDrillStore((s) => s.phase);
  const result = useDrillStore((s) => s.result);
  const setExampleInput = useDrillStore((s) => s.setExampleInput);
  const submitExample = useDrillStore((s) => s.submitExample);
  const cancelExample = useDrillStore((s) => s.cancelExample);
  const startExample = useDrillStore((s) => s.startExample);
  const dismiss = useDrillStore((s) => s.dismiss);
  const nodes = useGraphStore((s) => s.nodes);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [noMore, setNoMore] = useState(false);

  const activeDrill =
    phase === 'active' && currentDrill?.kind === 'example' ? currentDrill : null;
  const gradedDrill =
    phase === 'graded' && result?.drill.kind === 'example' ? result.drill : null;

  if (activeDrill) {
    const sourceNode = nodes.find((n) => n.id === activeDrill.sourceNodeId);
    const sourceTitle = sourceNode?.title ?? '(missing)';
    const layer1 = sourceNode?.layers?.[0];
    const layer1Content =
      layer1 && layer1.contentType === 'text' ? layer1.content : '';
    const tooLong = layer1Content.length > PREVIEW_CHARS;
    const previewText =
      previewExpanded || !tooLong
        ? layer1Content
        : layer1Content.slice(0, PREVIEW_CHARS) + '…';

    const trimmed = activeDrill.userInput.trim();
    const canSubmit = trimmed.length >= 10;

    return (
      <div style={{ maxWidth: 600, width: '100%', margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}
          >
            Topic
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--text)',
              marginBottom: 8,
            }}
          >
            {sourceTitle}
          </div>
          {layer1Content && (
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                cursor: tooLong ? 'pointer' : 'default',
                whiteSpace: 'pre-wrap',
              }}
              onClick={() => tooLong && setPreviewExpanded((v) => !v)}
              title={
                tooLong ? (previewExpanded ? 'Click to collapse' : 'Click to expand') : ''
              }
            >
              {previewText}
            </div>
          )}
        </div>

        <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>
          Give a concrete example or counterexample.
        </div>
        <textarea
          id="example-drill-input"
          name="exampleDrillInput"
          value={activeDrill.userInput}
          onChange={(e) => setExampleInput(e.target.value)}
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
            onClick={() => void submitExample()}
            disabled={!canSubmit}
            style={{
              ...primaryBtnStyle,
              opacity: canSubmit ? 1 : 0.45,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            Submit
          </button>
          <button type="button" onClick={cancelExample} style={secondaryBtnStyle}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (gradedDrill) {
    const sourceNode = nodes.find((n) => n.id === gradedDrill.sourceNodeId);
    const sourceTitle = sourceNode?.title ?? '(missing)';

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
          Example added.
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
          +0.05 mastery on{' '}
          <strong style={{ color: 'var(--text)' }}>{sourceTitle}</strong>.
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
            No more eligible topics.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => {
              setNoMore(false);
              const ok = startExample();
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

export default ExampleDrill;