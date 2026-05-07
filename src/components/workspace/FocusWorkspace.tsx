import type { CSSProperties, KeyboardEvent } from 'react';
import { useDrillStore } from '../../store/drillStore';
import { useGraphStore } from '../../store/graphStore';
import { useViewStore } from '../../store/viewStore';
import type { NodeDoc } from '../../types/graph';

const MIN_TEXT_LEN = 30;
const COLOR_OK = '#5cb87a';
const COLOR_BAD = '#c0504a';

const containerStyle: CSSProperties = { display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg)', color: 'var(--text)', overflow: 'hidden' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--panel-border)', background: 'var(--panel-bg)', flexShrink: 0 };
const titleStyle: CSSProperties = { fontSize: 16, fontWeight: 600, color: 'var(--text)' };
const exitBtnStyle: CSSProperties = { background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--panel-border)', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' };
const bodyStyle: CSSProperties = { flex: 1, overflow: 'auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' };
const passageStyle: CSSProperties = { maxWidth: 720, width: '100%', fontSize: 18, lineHeight: 1.9, margin: '24px 0' };
const blankInputStyle: CSSProperties = { background: 'var(--panel-bg)', border: 'none', borderBottom: '2px solid var(--accent)', color: 'var(--text)', fontSize: 18, padding: '2px 6px', margin: '0 2px', width: '12ch', outline: 'none', fontFamily: 'inherit' };
const primaryBtnStyle: CSSProperties = { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 500, fontFamily: 'inherit' };
const secondaryBtnStyle: CSSProperties = { ...primaryBtnStyle, background: 'transparent', color: 'var(--text)', border: '1px solid var(--panel-border)' };

function isEligibleForDrill(n: NodeDoc): boolean {
  return n.layers.some(
    (l) => l.contentType === 'text' && typeof l.content === 'string' && l.content.trim().length >= MIN_TEXT_LEN
  );
}

export default function FocusWorkspace() {
  const phase = useDrillStore((s) => s.phase);
  const currentDrill = useDrillStore((s) => s.currentDrill);
  const result = useDrillStore((s) => s.result);
  const setAnswer = useDrillStore((s) => s.setAnswer);
  const submit = useDrillStore((s) => s.submit);
  const startCloze = useDrillStore((s) => s.startCloze);
  const dismiss = useDrillStore((s) => s.dismiss);
  const nodes = useGraphStore((s) => s.nodes);
  const setViewMode = useViewStore((s) => s.setViewMode);

  const node = currentDrill ? nodes.find((n) => n.id === currentDrill.nodeId) ?? null : null;
  const handleExit = () => { dismiss(); setViewMode('canvas'); };
  const allFilled = currentDrill !== null && currentDrill.blanks.every((b) => b.userAnswer.trim().length > 0);
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && allFilled) { e.preventDefault(); submit(); }
  };
  const handleStudyAnother = () => {
    const currentNodeId = currentDrill?.nodeId;
    const others = nodes.filter((n) => !n.archived && isEligibleForDrill(n) && n.id !== currentNodeId);
    const fallback = nodes.filter((n) => !n.archived && isEligibleForDrill(n));
    const pool = others.length > 0 ? others : fallback;
    if (pool.length === 0) { dismiss(); setViewMode('canvas'); return; }
    startCloze(pool[Math.floor(Math.random() * pool.length)]);
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>{node ? node.title : 'Memorizer'}</div>
        <button onClick={handleExit} style={exitBtnStyle}>&#x2715; Exit</button>
      </div>
      <div style={bodyStyle}>
        {phase === 'idle' && (
          <div style={{ marginTop: 80, color: 'var(--text-muted)', fontSize: 16, textAlign: 'center' }}>
            Select a node and press &lsquo;Study this node&rsquo; to begin.
          </div>
        )}
        {phase === 'active' && currentDrill && (
          <>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>Fill in the blanks.</div>
            <div style={passageStyle}>
              {currentDrill.displayText.map((token, i) => {
                if (token === '') {
                  const blankIdx = currentDrill.blanks.findIndex((b) => b.index === i);
                  if (blankIdx === -1) return null;
                  const blank = currentDrill.blanks[blankIdx];
                  return (
                    <input key={i} type="text" value={blank.userAnswer}
                      onChange={(e) => setAnswer(blankIdx, e.target.value)}
                      onKeyDown={handleKeyDown} style={blankInputStyle}
                      autoFocus={blankIdx === 0} autoComplete="off" spellCheck={false} />
                  );
                }
                return <span key={i}>{token} </span>;
              })}
            </div>
            <button onClick={submit} disabled={!allFilled} style={{ ...primaryBtnStyle, opacity: allFilled ? 1 : 0.5, cursor: allFilled ? 'pointer' : 'not-allowed' }}>Submit</button>
          </>
        )}
        {phase === 'graded' && result && currentDrill && (
          <>
            <div style={{ fontSize: 32, fontWeight: 700, marginTop: 16, marginBottom: 12 }}>{result.correct} / {result.total} correct</div>
            <div style={{ fontSize: 16, marginBottom: 24, color: result.masteryDelta > 0 ? COLOR_OK : result.masteryDelta < 0 ? COLOR_BAD : 'var(--text-muted)' }}>
              {result.masteryDelta > 0 && `+ ${result.masteryDelta.toFixed(2)} mastery`}
              {result.masteryDelta < 0 && `\u2212 ${Math.abs(result.masteryDelta).toFixed(2)} mastery`}
              {result.masteryDelta === 0 && 'No change'}
            </div>
            <div style={passageStyle}>
              {currentDrill.displayText.map((token, i) => {
                if (token === '') {
                  const blank = currentDrill.blanks.find((b) => b.index === i);
                  if (!blank) return null;
                  const isCorrect = blank.answer.trim().toLowerCase() === blank.userAnswer.trim().toLowerCase();
                  if (isCorrect) return <span key={i} style={{ color: COLOR_OK, fontWeight: 600 }}>{blank.userAnswer || blank.answer}{' '}</span>;
                  return (
                    <span key={i} style={{ display: 'inline-block', margin: '0 4px' }}>
                      <span style={{ color: COLOR_BAD, textDecoration: 'line-through', marginRight: 6 }}>{blank.userAnswer || '(blank)'}</span>
                      <span style={{ color: COLOR_OK, fontWeight: 600 }}>{blank.answer}</span>{' '}
                    </span>
                  );
                }
                return <span key={i}>{token} </span>;
              })}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleStudyAnother} style={primaryBtnStyle}>Study Another</button>
              <button onClick={handleExit} style={secondaryBtnStyle}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
