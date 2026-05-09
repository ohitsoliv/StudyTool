// src/components/canvas/GraphCard.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { masteryToColor } from '../../utils/masteryColor';
import { useUniverseStore } from '../../store/universeStore';
import type { AggregateMastery } from '../../types/universe';

export interface GraphCardData extends Record<string, unknown> {
  name: string;
  semester: string | null;
  tags: string[];
  aggregate: AggregateMastery;
}

type GraphCardType = Node<GraphCardData, 'graph'>;

const HANDLE_STYLE: React.CSSProperties = {
  width: 6,
  height: 6,
  background: '#555',
  border: '1px solid #888',
  opacity: 0.4,
  transition: 'opacity 0.15s',
};

const MAX_TAGS_VISIBLE = 3;

function GraphCard({ data, selected, id }: NodeProps<GraphCardType>) {
  const { name, semester, tags, aggregate } = data;
  const renamingGraphId = useUniverseStore((s) => s.renamingGraphId);
  const renameGraph = useUniverseStore((s) => s.renameGraph);
  const setRenamingGraphId = useUniverseStore((s) => s.setRenamingGraphId);

  const isRenaming = renamingGraphId === id;
  const inputRef = useRef<HTMLInputElement>(null);
  const [draftName, setDraftName] = useState(name);

  useEffect(() => {
    if (isRenaming) {
      setDraftName(name);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [isRenaming, name]);

  const hasNodes = aggregate.nodeCount > 0;
  const borderColor = hasNodes
    ? masteryToColor(aggregate.mean)
    : 'var(--text-muted)';
  const coverageRatio = hasNodes
    ? aggregate.reviewedCount / aggregate.nodeCount
    : 0;

  const containerStyle: React.CSSProperties = {
    width: 220,
    padding: '14px 18px 10px',
    borderRadius: 12,
    background: '#1e1e2e',
    borderLeft: `3px solid ${borderColor}`,
    outline: selected ? '1px solid var(--accent)' : 'none',
    boxShadow: selected
      ? `0 0 0 3px rgba(107,138,253,0.2), inset 4px 0 6px -4px ${borderColor}`
      : `0 2px 8px rgba(0,0,0,0.4), inset 4px 0 6px -4px ${borderColor}`,
    cursor: 'grab',
    position: 'relative',
    transition: 'outline 0.15s, box-shadow 0.15s',
    userSelect: 'none',
    color: 'var(--text)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: 6,
  };

  const pillStyle: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    padding: '2px 8px',
    marginRight: 4,
    marginBottom: 4,
    whiteSpace: 'nowrap',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 15,
    fontWeight: 500,
    background: '#0f0f12',
    border: '1px solid var(--accent)',
    color: 'var(--text)',
    borderRadius: 4,
    padding: '4px 6px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    marginBottom: 6,
  };

  const visibleTags = tags.slice(0, MAX_TAGS_VISIBLE);
  const overflow = tags.length - visibleTags.length;

  const commitRename = () => {
    void renameGraph(id, draftName);
  };

  return (
    <div style={containerStyle}>
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />

      {isRenaming ? (
        <input
          ref={inputRef}
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onBlur={commitRename}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              e.preventDefault();
              commitRename();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setRenamingGraphId(null);
            }
          }}
          style={inputStyle}
        />
      ) : (
        <div style={titleStyle}>{name}</div>
      )}

      {!isRenaming && semester && (
        <div style={{ marginBottom: 4 }}>
          <span style={pillStyle}>{semester}</span>
        </div>
      )}

      {!isRenaming && tags.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          {visibleTags.map((t) => (
            <span key={t} style={pillStyle}>
              {t}
            </span>
          ))}
          {overflow > 0 && <span style={pillStyle}>+{overflow} more</span>}
        </div>
      )}

      {hasNodes ? (
        <>
          <div
            style={{
              height: 3,
              width: '100%',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 2,
              overflow: 'hidden',
              marginTop: 6,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round(coverageRatio * 100)}%`,
                background: 'var(--accent)',
                opacity: 0.55,
              }}
            />
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {aggregate.nodeCount}{' '}
            {aggregate.nodeCount === 1 ? 'node' : 'nodes'}
            {aggregate.reviewedCount > 0
              ? ` · ${aggregate.reviewedCount} reviewed`
              : ''}
          </div>
        </>
      ) : (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginTop: 4,
            fontStyle: 'italic',
          }}
        >
          Empty
        </div>
      )}
    </div>
  );
}

export default memo(GraphCard);
