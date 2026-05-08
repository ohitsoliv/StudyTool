import React, { useState } from 'react';
import { useDrillStore } from '../../store/drillStore';
import { useGraphStore } from '../../store/graphStore';

export default function SorterOverlay() {
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const phase = useDrillStore((s) => s.phase);
  const submitSorter = useDrillStore((s) => s.submitSorter);
  const giveUpSorter = useDrillStore((s) => s.giveUpSorter);
  const startSorter = useDrillStore((s) => s.startSorter);
  const dismiss = useDrillStore((s) => s.dismiss);
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const [noMore, setNoMore] = useState(false);

  if (!currentDrill || currentDrill.kind !== 'sorter') return null;
  if (phase !== 'active' && phase !== 'graded') return null;

  const drill = currentDrill;
  const placedCount = drill.childIds.filter((c) => drill.userAssignments[c] !== null).length;
  const totalCount = drill.childIds.length;
  const allPlaced = placedCount === totalCount;

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
    maxWidth: 400,
    minWidth: 280,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'all',
  };

  const headerStyle: React.CSSProperties = {
    fontWeight: 600,
    fontSize: 14,
    color: 'var(--text)',
  };

  const mutedStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--text-muted)',
  };

  const btnRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  };

  const primaryBtn: React.CSSProperties = {
    flex: 1,
    padding: '7px 14px',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  };

  const disabledBtn: React.CSSProperties = {
    ...primaryBtn,
    background: 'rgba(107,138,253,0.3)',
    cursor: 'not-allowed',
  };

  const secondaryBtn: React.CSSProperties = {
    flex: 1,
    padding: '7px 14px',
    background: 'transparent',
    color: 'var(--text-muted)',
    border: '1px solid var(--panel-border)',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
  };

  if (phase === 'active') {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>Sorter</div>
        <div style={{ fontSize: 13, color: 'var(--text)' }}>
          Drag each child back to its correct parent. {totalCount} to place.
        </div>
        <div style={mutedStyle}>{placedCount}/{totalCount} placed</div>
        <div style={btnRowStyle}>
          <button
            style={allPlaced ? primaryBtn : disabledBtn}
            disabled={!allPlaced}
            onClick={() => { void submitSorter(); }}
          >
            Submit
          </button>
          <button style={secondaryBtn} onClick={() => { void giveUpSorter(); }}>
            Give Up
          </button>
        </div>
      </div>
    );
  }

  // Graded phase
  const score = drill.score ?? 0;
  const gaveUp = drill.gaveUp === true;
  const correct = drill.childIds.filter((c) => drill.userAssignments[c] === drill.truth[c]).length;

  let verdictText: string;
  let verdictColor: string;
  if (gaveUp) {
    verdictText = `Gave up — ${correct}/${totalCount} correct. Mastery −10%.`;
    verdictColor = '#c0504a';
  } else if (score === 1.0) {
    verdictText = `Perfect! ${correct}/${totalCount} correct. Mastery +10%.`;
    verdictColor = '#5a7a4a';
  } else if (score >= 0.80) {
    verdictText = `Good — ${correct}/${totalCount} correct. Mastery +5%.`;
    verdictColor = '#5a7a4a';
  } else if (score >= 0.50) {
    verdictText = `${correct}/${totalCount} correct. No mastery change.`;
    verdictColor = 'var(--text-muted)';
  } else {
    verdictText = `${correct}/${totalCount} correct. Mastery −10%.`;
    verdictColor = '#c0504a';
  }

  const handlePickAnother = () => {
    const ok = startSorter(nodes, edges);
    if (!ok) {
      setNoMore(true);
      setTimeout(() => setNoMore(false), 3000);
    }
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>Result</div>
      <div style={{ fontSize: 13, color: verdictColor, fontWeight: 500 }}>{verdictText}</div>
      <div style={mutedStyle}>
        Children stay where you placed them; parent-child edges show the correct relationships.
      </div>
      {noMore && (
        <div style={{ fontSize: 12, color: '#c0504a' }}>
          Need 2+ parents with multiple children — build more hierarchy first.
        </div>
      )}
      <div style={btnRowStyle}>
        <button style={primaryBtn} onClick={handlePickAnother}>
          Pick another
        </button>
        <button style={secondaryBtn} onClick={dismiss}>
          Done
        </button>
      </div>
    </div>
  );
}
