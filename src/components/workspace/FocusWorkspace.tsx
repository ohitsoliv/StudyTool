import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import Editor from '@monaco-editor/react';
import { useDrillStore } from '../../store/drillStore';
import { useGraphStore } from '../../store/graphStore';
import { useViewStore } from '../../store/viewStore';
import FocusPicker from './FocusPicker';
import type { NodeDoc } from '../../types/graph';

const MIN_TEXT_LEN = 30;
const COLOR_OK = '#5cb87a';
const COLOR_BAD = '#c0504a';
const INVALID_FLASH_MS = 600;

const containerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%',
  background: 'var(--bg)',
  color: 'var(--text)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid var(--panel-border)',
  background: 'var(--panel-bg)',
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--text)',
};

const exitBtnStyle: CSSProperties = {
  background: 'transparent',
  color: 'var(--text-muted)',
  border: '1px solid var(--panel-border)',
  borderRadius: 6,
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
};

const bodyStyle: CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '32px 24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const passageStyle: CSSProperties = {
  maxWidth: 720,
  width: '100%',
  fontSize: 18,
  lineHeight: 1.9,
  margin: '24px 0',
};

const blankInputStyle: CSSProperties = {
  background: 'var(--panel-bg)',
  border: 'none',
  borderBottom: '2px solid var(--accent)',
  color: 'var(--text)',
  fontSize: 18,
  padding: '2px 6px',
  margin: '0 2px',
  width: '12ch',
  outline: 'none',
  fontFamily: 'inherit',
};

const primaryBtnStyle: CSSProperties = {
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

const secondaryBtnStyle: CSSProperties = {
  ...primaryBtnStyle,
  background: 'transparent',
  color: 'var(--text)',
  border: '1px solid var(--panel-border)',
};

// ---- Path-finder styles ----

const endpointRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  marginTop: 4,
  marginBottom: 16,
};

const endpointLabelStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 4,
  textAlign: 'center',
};

const endpointCardBase: CSSProperties = {
  background: 'var(--panel-bg)',
  borderRadius: 8,
  padding: '10px 16px',
  minWidth: 180,
  textAlign: 'center',
  fontSize: 15,
  fontWeight: 500,
  color: 'var(--text)',
};

const arrowStyle: CSSProperties = {
  fontSize: 22,
  color: 'var(--text-muted)',
  marginTop: 18, // align with endpoint cards (label adds height above)
};

const chipRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  alignItems: 'center',
  marginTop: 8,
  maxWidth: 720,
  width: '100%',
};

const chipStyle: CSSProperties = {
  background: 'var(--panel-bg)',
  border: '1px solid var(--accent)',
  borderRadius: 999,
  padding: '4px 10px',
  fontSize: 13,
  color: 'var(--text)',
};

const poolWrapStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 24,
  maxWidth: 720,
  width: '100%',
  justifyContent: 'center',
};

const poolCardBase: CSSProperties = {
  background: 'var(--panel-bg)',
  borderRadius: 8,
  padding: '8px 12px',
  minWidth: 140,
  textAlign: 'center',
  cursor: 'pointer',
  fontSize: 14,
  color: 'var(--text)',
  userSelect: 'none',
};

function isEligibleForDrill(n: NodeDoc): boolean {
  return n.layers.some(
    (l) =>
      l.contentType === 'text' &&
      typeof l.content === 'string' &&
      l.content.trim().length >= MIN_TEXT_LEN
  );
}

export default function FocusWorkspace() {
  const phase = useDrillStore((s) => s.phase);
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const result = useDrillStore((s) => s.result);
  const setAnswer = useDrillStore((s) => s.setAnswer);
  const submit = useDrillStore((s) => s.submit);
  const startCloze = useDrillStore((s) => s.startCloze);
  const startPathFinder = useDrillStore((s) => s.startPathFinder);
  const clickPathStep = useDrillStore((s) => s.clickPathStep);
  const giveUp = useDrillStore((s) => s.giveUp);
  const dismiss = useDrillStore((s) => s.dismiss);
  const setProblemStatement = useDrillStore((s) => s.setProblemStatement);
  const commitProblemStatement = useDrillStore((s) => s.commitProblemStatement);
  const removeFromPipeline = useDrillStore((s) => s.removeFromPipeline);
  const reorderPipeline = useDrillStore((s) => s.reorderPipeline);
  const submitScenarioBuilder = useDrillStore((s) => s.submitScenarioBuilder);
  const gradeScenarioBuilder = useDrillStore((s) => s.gradeScenarioBuilder);
  const startScenarioBuilder = useDrillStore((s) => s.startScenarioBuilder);
  const startDebugger = useDrillStore((s) => s.startDebugger);
  const setDebuggerInput = useDrillStore((s) => s.setDebuggerInput);
  const submitDebugger = useDrillStore((s) => s.submitDebugger);
  const giveUpDebugger = useDrillStore((s) => s.giveUpDebugger);

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const setViewMode = useViewStore((s) => s.setViewMode);

  const [lastInvalidId, setLastInvalidId] = useState<string | null>(null);
  const invalidTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [expandedNeighborId, setExpandedNeighborId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (invalidTimeoutRef.current !== null) {
        clearTimeout(invalidTimeoutRef.current);
        invalidTimeoutRef.current = null;
      }
    };
  }, []);

  const handleExit = () => {
    dismiss();
    setViewMode('canvas');
  };

  // Narrowed views (consts hold the discriminated type for use inside callbacks).
  const activeCloze =
    phase === 'active' && currentDrill && currentDrill.kind === 'cloze'
      ? currentDrill
      : null;
  const activePath =
    phase === 'active' && currentDrill && currentDrill.kind === 'path-finder'
      ? currentDrill
      : null;
  const gradedCloze =
    phase === 'graded' && result && result.drill.kind === 'cloze'
      ? { result, drill: result.drill }
      : null;
  const gradedPath =
    phase === 'graded' && result && result.drill.kind === 'path-finder'
      ? { result, drill: result.drill }
      : null;

  // ---- cloze helpers (existing, unchanged) ----
  const allFilled =
    activeCloze !== null &&
    Array.isArray(activeCloze.blanks) &&
    activeCloze.blanks.every((b) => b.userAnswer.trim().length > 0);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && allFilled) {
      e.preventDefault();
      submit();
    }
  };

  const handleStudyAnother = () => {
    const currentNodeId = activeCloze?.nodeId ?? gradedCloze?.drill.nodeId ?? null;
    const others = nodes.filter(
      (n) => !n.archived && isEligibleForDrill(n) && n.id !== currentNodeId
    );
    const fallback = nodes.filter((n) => !n.archived && isEligibleForDrill(n));
    const pool = others.length > 0 ? others : fallback;
    if (pool.length === 0) {
      dismiss();
      setViewMode('canvas');
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    startCloze(pick);
  };

  // ---- path-finder helpers ----
  const handlePoolClick = (id: string) => {
    const outcome = clickPathStep(id);
    if (outcome === 'invalid') {
      if (invalidTimeoutRef.current !== null) {
        clearTimeout(invalidTimeoutRef.current);
      }
      setLastInvalidId(id);
      invalidTimeoutRef.current = setTimeout(() => {
        setLastInvalidId(null);
        invalidTimeoutRef.current = null;
      }, INVALID_FLASH_MS);
    } else if (outcome === 'finished') {
      submit();
    }
  };

  const handleTryAnother = () => {
    const ok = startPathFinder();
    if (!ok) {
      dismiss();
      setViewMode('canvas');
    }
  };

  const titleById = (id: string): string =>
    nodes.find((n) => n.id === id)?.title ?? '(missing)';

  // Header label
  const clozeNode = activeCloze
    ? nodes.find((n) => n.id === activeCloze.nodeId) ?? null
    : null;
  const headerLabel = (() => {
    if (currentDrill?.kind === 'scenario-builder') return 'Scenario Builder';
    if (currentDrill?.kind === 'debugger') {
      const n = nodes.find((x) => x.id === currentDrill.nodeId);
      return `${n?.title ?? 'Node'} (Debugger) — Layer ${currentDrill.layerDepth}`;
    }
    if (activeCloze) return clozeNode?.title ?? 'Memorizer';
    if (gradedCloze)
      return nodes.find((n) => n.id === gradedCloze.drill.nodeId)?.title ?? 'Memorizer';
    if (activePath || gradedPath) return 'Path Finder';
    return 'Memorizer';
  })();

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>{headerLabel}</div>
        <button onClick={handleExit} style={exitBtnStyle}>
          ✕ Exit
        </button>
      </div>

      <div style={bodyStyle}>
        {phase === 'idle' && !currentDrill && <FocusPicker />}

        {/* ============ ACTIVE: CLOZE ============ */}
        {activeCloze && (
          <>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 14,
                marginBottom: 8,
              }}
            >
              Fill in the blanks.
            </div>

            <div style={passageStyle}>
              {activeCloze.displayText.map((token, i) => {
                if (token === '') {
                  const blankIdx = activeCloze.blanks.findIndex(
                    (b) => b.index === i
                  );
                  if (blankIdx === -1) return null;
                  const blank = activeCloze.blanks[blankIdx];
                  return (
                    <input
                      key={i}
                      type="text"
                      value={blank.userAnswer}
                      onChange={(e) => setAnswer(blankIdx, e.target.value)}
                      onKeyDown={handleKeyDown}
                      style={blankInputStyle}
                      autoFocus={blankIdx === 0}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  );
                }
                return <span key={i}>{token} </span>;
              })}
            </div>

            <button
              onClick={submit}
              disabled={!allFilled}
              style={{
                ...primaryBtnStyle,
                opacity: allFilled ? 1 : 0.5,
                cursor: allFilled ? 'pointer' : 'not-allowed',
              }}
            >
              Submit
            </button>
          </>
        )}

        {/* ============ ACTIVE: PATH FINDER ============ */}
        {activePath && (
          <>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              Find a path
            </div>

            <div style={endpointRowStyle}>
              <div>
                <div style={endpointLabelStyle}>Start</div>
                <div
                  style={{
                    ...endpointCardBase,
                    border: '1px solid var(--panel-border)',
                  }}
                >
                  {titleById(activePath.startNodeId)}
                </div>
              </div>
              <div style={arrowStyle}>→</div>
              <div>
                <div style={endpointLabelStyle}>Goal</div>
                <div
                  onClick={() => handlePoolClick(activePath.endNodeId)}
                  onMouseEnter={(e) => {
                    if (lastInvalidId !== activePath.endNodeId) {
                      (e.currentTarget as HTMLDivElement).style.outline =
                        '1px solid var(--accent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.outline = 'none';
                  }}
                  style={{
                    ...endpointCardBase,
                    cursor: 'pointer',
                    border:
                      lastInvalidId === activePath.endNodeId
                        ? `1px solid ${COLOR_BAD}`
                        : '1px solid var(--panel-border)',
                  }}
                >
                  {titleById(activePath.endNodeId)}
                </div>
              </div>
            </div>

            <div style={chipRowStyle}>
              {activePath.userPath.length === 0 ? (
                <div
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 13,
                    fontStyle: 'italic',
                  }}
                >
                  Click a node connected to Start.
                </div>
              ) : (
                activePath.userPath.map((id) => (
                  <span key={id} style={chipStyle}>
                    {titleById(id)}
                  </span>
                ))
              )}
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              Steps: {activePath.userPath.length} • Wrong:{' '}
              {activePath.invalidAttempts}
            </div>

            <div style={poolWrapStyle}>
              {nodes
                .filter(
                  (n) =>
                    !n.archived &&
                    n.id !== activePath.startNodeId &&
                    n.id !== activePath.endNodeId &&
                    !activePath.userPath.includes(n.id)
                )
                .map((n) => {
                  const flashing = lastInvalidId === n.id;
                  return (
                    <div
                      key={n.id}
                      onClick={() => handlePoolClick(n.id)}
                      onMouseEnter={(e) => {
                        if (!flashing) {
                          (e.currentTarget as HTMLDivElement).style.outline =
                            '1px solid var(--accent)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.outline =
                          'none';
                      }}
                      style={{
                        ...poolCardBase,
                        border: flashing
                          ? `1px solid ${COLOR_BAD}`
                          : '1px solid var(--panel-border)',
                      }}
                    >
                      {n.title}
                    </div>
                  );
                })}
            </div>

            <div style={{ marginTop: 24 }}>
              <button onClick={giveUp} style={secondaryBtnStyle}>
                Give Up
              </button>
            </div>
          </>
        )}

        {/* ============ GRADED: CLOZE ============ */}
        {gradedCloze && (
          <>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                marginTop: 16,
                marginBottom: 12,
              }}
            >
              {gradedCloze.result.correct ?? 0} /{' '}
              {gradedCloze.result.total ?? 0} correct
            </div>

            <div
              style={{
                fontSize: 16,
                marginBottom: 24,
                color:
                  gradedCloze.result.masteryDelta > 0
                    ? COLOR_OK
                    : gradedCloze.result.masteryDelta < 0
                    ? COLOR_BAD
                    : 'var(--text-muted)',
              }}
            >
              {gradedCloze.result.masteryDelta > 0 &&
                `+ ${gradedCloze.result.masteryDelta.toFixed(2)} mastery`}
              {gradedCloze.result.masteryDelta < 0 &&
                `− ${Math.abs(gradedCloze.result.masteryDelta).toFixed(
                  2
                )} mastery`}
              {gradedCloze.result.masteryDelta === 0 && 'No change'}
            </div>

            <div style={passageStyle}>
              {gradedCloze.drill.displayText.map((token, i) => {
                if (token === '') {
                  const blank = gradedCloze.drill.blanks.find(
                    (b) => b.index === i
                  );
                  if (!blank) return null;
                  const isCorrect =
                    blank.answer.trim().toLowerCase() ===
                    blank.userAnswer.trim().toLowerCase();
                  if (isCorrect) {
                    return (
                      <span
                        key={i}
                        style={{ color: COLOR_OK, fontWeight: 600 }}
                      >
                        {blank.userAnswer || blank.answer}{' '}
                      </span>
                    );
                  }
                  return (
                    <span
                      key={i}
                      style={{ display: 'inline-block', margin: '0 4px' }}
                    >
                      <span
                        style={{
                          color: COLOR_BAD,
                          textDecoration: 'line-through',
                          marginRight: 6,
                        }}
                      >
                        {blank.userAnswer || '(blank)'}
                      </span>
                      <span style={{ color: COLOR_OK, fontWeight: 600 }}>
                        {blank.answer}
                      </span>{' '}
                    </span>
                  );
                }
                return <span key={i}>{token} </span>;
              })}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleStudyAnother} style={primaryBtnStyle}>
                Study Another
              </button>
              <button onClick={handleExit} style={secondaryBtnStyle}>
                Done
              </button>
            </div>
          </>
        )}

        {/* ============ GRADED: PATH FINDER ============ */}
        {gradedPath && (
          <>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                marginTop: 16,
                marginBottom: 12,
              }}
            >
              {gradedPath.result.reachedEnd
                ? `Found in ${gradedPath.result.validSteps} steps`
                : 'Gave up'}
            </div>

            <div
              style={{
                fontSize: 14,
                color: 'var(--text-muted)',
                marginBottom: 8,
                textAlign: 'center',
                maxWidth: 720,
              }}
            >
              {gradedPath.result.reachedEnd
                ? `Shortest path was ${gradedPath.result.shortestPathLength}. Wrong attempts: ${gradedPath.result.invalidAttempts}.`
                : `Stopped after ${gradedPath.result.validSteps} valid step(s) and ${gradedPath.result.invalidAttempts} wrong attempt(s).`}
            </div>

            <div
              style={{
                fontSize: 16,
                marginBottom: 16,
                color:
                  gradedPath.result.masteryDelta > 0
                    ? COLOR_OK
                    : gradedPath.result.masteryDelta < 0
                    ? COLOR_BAD
                    : 'var(--text-muted)',
              }}
            >
              {gradedPath.result.masteryDelta > 0 &&
                `+ ${gradedPath.result.masteryDelta.toFixed(2)} mastery`}
              {gradedPath.result.masteryDelta < 0 &&
                `− ${Math.abs(gradedPath.result.masteryDelta).toFixed(
                  2
                )} mastery`}
              {gradedPath.result.masteryDelta === 0 && 'No change'}
            </div>

            <div style={chipRowStyle}>
              <span style={chipStyle}>
                {titleById(gradedPath.drill.startNodeId)}
              </span>
              {gradedPath.drill.userPath.map((id) => (
                <span key={id} style={chipStyle}>
                  {titleById(id)}
                </span>
              ))}
              {/* When reachedEnd, last userPath entry IS the goal — no duplicate append.
                  When !reachedEnd, end is intentionally omitted per spec. */}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button onClick={handleTryAnother} style={primaryBtnStyle}>
                Try Another
              </button>
              <button onClick={handleExit} style={secondaryBtnStyle}>
                Done
              </button>
            </div>
          </>
        )}

        {/* ============ ACTIVE: SCENARIO BUILDER — AUTHORING ============ */}
        {phase === 'active' && currentDrill?.kind === 'scenario-builder' && currentDrill.builderPhase === 'authoring' && (
          <>
            <div style={{ maxWidth: 600, width: '100%' }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
                Describe a problem or scenario, then assemble a pipeline of relevant nodes from your graph.
              </div>
              <textarea
                value={currentDrill.problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="e.g., Design a recommendation system that handles cold-start users."
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
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {currentDrill.problemStatement.trim().length} / 10 minimum
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button
                  onClick={commitProblemStatement}
                  disabled={currentDrill.problemStatement.trim().length < 10}
                  style={{
                    ...primaryBtnStyle,
                    opacity: currentDrill.problemStatement.trim().length >= 10 ? 1 : 0.45,
                    cursor: currentDrill.problemStatement.trim().length >= 10 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Start
                </button>
                <button onClick={dismiss} style={secondaryBtnStyle}>Cancel</button>
              </div>
            </div>
          </>
        )}

        {/* ============ ACTIVE: SCENARIO BUILDER — BUILDING ============ */}
        {phase === 'active' && currentDrill?.kind === 'scenario-builder' && currentDrill.builderPhase === 'building' && (
          <>
            <div style={{ maxWidth: 600, width: '100%' }}>
              <div style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderLeft: '3px solid var(--accent)',
                borderRadius: 6,
                padding: '10px 14px',
                fontSize: 14,
                color: 'var(--text)',
                marginBottom: 20,
                fontStyle: 'italic',
              }}>
                {currentDrill.problemStatement}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                Pipeline ({currentDrill.pipeline.length})
              </div>
              {currentDrill.pipeline.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 16 }}>
                  Click nodes on the canvas to add them to your pipeline.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {currentDrill.pipeline.map((nodeId, i) => (
                    <div key={nodeId} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'var(--panel-bg)',
                      border: '1px solid var(--panel-border)',
                      borderRadius: 6,
                      padding: '7px 10px',
                    }}>
                      <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, minWidth: 18 }}>{i + 1}</span>
                      <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{titleById(nodeId)}</span>
                      <button
                        onClick={() => reorderPipeline(i, i - 1)}
                        disabled={i === 0}
                        style={{ background: 'transparent', border: 'none', color: i === 0 ? 'var(--text-muted)' : 'var(--text)', cursor: i === 0 ? 'default' : 'pointer', fontSize: 14, padding: '0 4px' }}
                      >↑</button>
                      <button
                        onClick={() => reorderPipeline(i, i + 1)}
                        disabled={i === currentDrill.pipeline.length - 1}
                        style={{ background: 'transparent', border: 'none', color: i === currentDrill.pipeline.length - 1 ? 'var(--text-muted)' : 'var(--text)', cursor: i === currentDrill.pipeline.length - 1 ? 'default' : 'pointer', fontSize: 14, padding: '0 4px' }}
                      >↓</button>
                      <button
                        onClick={() => removeFromPipeline(i)}
                        style={{ background: 'transparent', border: 'none', color: '#c0504a', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={submitScenarioBuilder}
                  disabled={currentDrill.pipeline.length === 0}
                  style={{
                    ...primaryBtnStyle,
                    opacity: currentDrill.pipeline.length > 0 ? 1 : 0.45,
                    cursor: currentDrill.pipeline.length > 0 ? 'pointer' : 'not-allowed',
                  }}
                >
                  Submit
                </button>
                <button onClick={dismiss} style={secondaryBtnStyle}>Cancel</button>
              </div>
            </div>
          </>
        )}

        {/* ============ GRADED: SCENARIO BUILDER — VERDICT PENDING ============ */}
        {phase === 'graded' && result?.drill.kind === 'scenario-builder' && result.verdict === undefined && (
          <>
            <div style={{ maxWidth: 600, width: '100%' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Self-grade</div>
              <div style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderLeft: '3px solid var(--accent)',
                borderRadius: 6,
                padding: '10px 14px',
                fontSize: 14,
                color: 'var(--text)',
                marginBottom: 16,
                fontStyle: 'italic',
              }}>
                {result.problemStatement}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Pipeline
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                {(result.pipeline ?? []).map((nodeId, i) => (
                  <div key={nodeId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--panel-border)',
                    borderRadius: 6,
                    padding: '7px 10px',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, minWidth: 18 }}>{i + 1}</span>
                    <span style={{ fontSize: 14, color: 'var(--text)' }}>{titleById(nodeId)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button
                  onClick={() => void gradeScenarioBuilder('correct')}
                  style={{ ...primaryBtnStyle, flex: 1, background: '#4a7a5a' }}
                >Correct +0.10</button>
                <button
                  onClick={() => void gradeScenarioBuilder('partial')}
                  style={{ ...primaryBtnStyle, flex: 1, background: '#8a6a2a' }}
                >Partial +0.05</button>
                <button
                  onClick={() => void gradeScenarioBuilder('wrong')}
                  style={{ ...primaryBtnStyle, flex: 1, background: '#c0504a' }}
                >Wrong −0.10</button>
              </div>
              <button onClick={dismiss} style={secondaryBtnStyle}>Cancel</button>
            </div>
          </>
        )}

        {/* ============ GRADED: SCENARIO BUILDER — VERDICT PICKED ============ */}
        {phase === 'graded' && result?.drill.kind === 'scenario-builder' && result.verdict !== undefined && (
          <>
            <div style={{ maxWidth: 600, width: '100%' }}>
              <div style={{
                fontSize: 22,
                fontWeight: 700,
                marginBottom: 12,
                color: result.verdict === 'correct' ? '#5a9a6a' : result.verdict === 'partial' ? '#c8963a' : '#c0504a',
              }}>
                {result.verdict === 'correct' ? 'Marked correct' : result.verdict === 'partial' ? 'Marked partial' : 'Marked wrong'}
              </div>
              <div style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 20 }}>
                {(result.nodesAffected ?? []).length} node{(result.nodesAffected ?? []).length !== 1 ? 's' : ''} · mastery{' '}
                {(result.masteryDelta ?? 0) > 0 ? `+${result.masteryDelta?.toFixed(2)}` : result.masteryDelta?.toFixed(2)}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => startScenarioBuilder()} style={primaryBtnStyle}>Pick another</button>
                <button onClick={dismiss} style={secondaryBtnStyle}>Done</button>
              </div>
            </div>
          </>
        )}

        {/* ============ ACTIVE: DEBUGGER ============ */}
        {phase === 'active' && currentDrill?.kind === 'debugger' && (() => {
          const drill = currentDrill;
          const neighborIds = new Set<string>();
          for (const e of edges) {
            if (e.source === drill.nodeId) neighborIds.add(e.target);
            if (e.target === drill.nodeId) neighborIds.add(e.source);
          }
          const neighborNodes = nodes.filter((n) => neighborIds.has(n.id) && !n.archived);

          return (
            <div style={{ display: 'flex', width: '100%', height: '100%', gap: 0 }}>
              {/* Main editor column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Fix the broken version below so it matches the canonical content.
                </div>
                <div style={{ flex: 1, minHeight: 0, marginBottom: 16 }}>
                  {drill.contentType === 'code' ? (
                    <div style={{ border: '1px solid var(--panel-border)', borderRadius: 6, overflow: 'hidden', height: '100%' }}>
                      <Editor
                        height="100%"
                        theme="vs-dark"
                        language={drill.language ?? 'plaintext'}
                        value={drill.input}
                        onChange={(value) => setDebuggerInput(value ?? '')}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          wordWrap: 'on',
                          padding: { top: 10, bottom: 10 },
                          scrollBeyondLastLine: false,
                        }}
                      />
                    </div>
                  ) : (
                    <textarea
                      value={drill.input}
                      onChange={(e) => setDebuggerInput(e.target.value)}
                      style={{
                        width: '100%',
                        height: '100%',
                        resize: 'none',
                        background: '#0f0f12',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--text)',
                        borderRadius: 6,
                        padding: 10,
                        fontFamily: 'monospace',
                        fontSize: 13,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button onClick={submitDebugger} style={primaryBtnStyle}>Submit</button>
                  <button onClick={giveUpDebugger} style={secondaryBtnStyle}>Give Up</button>
                  <button onClick={dismiss} style={secondaryBtnStyle}>Cancel</button>
                </div>
              </div>

              {/* Neighbor side panel */}
              <div style={{
                width: 280,
                flexShrink: 0,
                borderLeft: '1px solid var(--panel-border)',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
              }}>
                <div style={{ padding: '12px 14px 8px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
                  Connected nodes
                </div>
                {neighborNodes.length === 0 && (
                  <div style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No connected neighbors.
                  </div>
                )}
                {neighborNodes.map((nb) => {
                  const preview = nb.layers[0]?.content.slice(0, 80) ?? '';
                  const isOpen = expandedNeighborId === nb.id;
                  return (
                    <div key={nb.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <button
                        onClick={() => setExpandedNeighborId(isOpen ? null : nb.id)}
                        style={{
                          width: '100%',
                          background: isOpen ? 'rgba(107,138,253,0.08)' : 'transparent',
                          border: 'none',
                          textAlign: 'left',
                          padding: '10px 14px',
                          cursor: 'pointer',
                          color: 'var(--text)',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{nb.title}</div>
                        {!isOpen && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {preview}
                          </div>
                        )}
                      </button>
                      {isOpen && (
                        <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {nb.layers.map((l, li) => (
                            <div key={li} style={{ fontSize: 11, background: '#0f0f12', border: '1px solid var(--panel-border)', borderRadius: 6, padding: 8 }}>
                              <div style={{ color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Layer {l.depth} · {l.contentType}
                              </div>
                              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--text)', fontFamily: l.contentType === 'code' ? 'monospace' : 'inherit', fontSize: 11 }}>
                                {l.content}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ============ GRADED: DEBUGGER ============ */}
        {phase === 'graded' && result?.drill.kind === 'debugger' && (() => {
          const sim = result.similarity ?? 0;
          const pct = Math.round(sim * 100);
          const verdictColor = sim >= 0.99 ? '#5cb87a' : sim >= 0.80 ? '#c8963a' : '#c0504a';
          const verdictLabel = sim >= 0.99 ? 'Excellent' : sim >= 0.80 ? 'Close' : 'Off track';
          const deltaSign = (result.masteryDelta ?? 0) >= 0 ? '+' : '−';
          const deltaAbs = Math.abs(result.masteryDelta ?? 0).toFixed(2);
          return (
            <div style={{ maxWidth: 600, width: '100%' }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: verdictColor, marginBottom: 12 }}>
                {verdictLabel}
              </div>
              <div style={{ fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>
                Similarity: {pct}%
              </div>
              <div style={{ fontSize: 15, color: (result.masteryDelta ?? 0) >= 0 ? COLOR_OK : COLOR_BAD, marginBottom: 24 }}>
                Mastery: {deltaSign}{deltaAbs}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => startDebugger()} style={primaryBtnStyle}>Pick another</button>
                <button onClick={dismiss} style={secondaryBtnStyle}>Done</button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}