import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import type { Layer } from '../../types/graph';
import { masteryToColor } from '../../utils/masteryColor';
import { useDrillStore } from '../../store/drillStore';

export interface StudyNodeData extends Record<string, unknown> {
  title: string;
  mastery: number;
  layerCount: number;
  layers: Layer[];
  zoomLevel: number;
}

type StudyNodeType = Node<StudyNodeData, 'study'>;

const HANDLE_STYLE: React.CSSProperties = {
  width: 6,
  height: 6,
  background: '#555',
  border: '1px solid #888',
  opacity: 0.4,
  transition: 'opacity 0.15s',
};

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function StudyNode({ data, selected, id }: NodeProps<StudyNodeType>) {
  const { title, mastery, layerCount, layers, zoomLevel } = data;
  const borderColor = masteryToColor(mastery);
  const layer1 = layers?.[0];
  const layer2 = layers?.[1];

  const showLayer1 = zoomLevel >= 1.2 && layer1;
  const showLayer2 = zoomLevel >= 2.0 && layer2;

  const currentDrill = useDrillStore((s) => s.currentDrill);
  const phase = useDrillStore((s) => s.phase);

  let drillState: 'source' | 'target' | 'in-path' | null = null;
  if (phase === 'active' && currentDrill?.kind === 'path-finder') {
    if (id === currentDrill.startNodeId) drillState = 'source';
    else if (id === currentDrill.endNodeId) drillState = 'target';
    else if (currentDrill.userPath.includes(id)) drillState = 'in-path';
  }

  let drillOutline: string | undefined;
  let drillBoxShadow: string | undefined;
  if (drillState === 'source') {
    drillOutline = '2px solid #6b8afd';
    drillBoxShadow = '0 0 0 4px rgba(107, 138, 253, 0.25)';
  } else if (drillState === 'target') {
    drillOutline = '2px solid #5a7a4a';
    drillBoxShadow = '0 0 0 4px rgba(90, 122, 74, 0.25)';
  } else if (drillState === 'in-path') {
    drillOutline = '2px dashed #d4924a';
  }

  // Missing Link highlight
  const isMissingLinkNode =
    phase === 'active' &&
    currentDrill?.kind === 'missing-link' &&
    (id === currentDrill.aId || id === currentDrill.bId);
  if (isMissingLinkNode) {
    drillOutline = '2px solid var(--accent)';
    drillBoxShadow = '0 0 0 4px rgba(107,138,253,0.25)';
  }

  // Cluster Title highlight
  const isClusterParent =
    currentDrill?.kind === 'cluster-title' &&
    phase === 'active' &&
    id === currentDrill.parentId;
  const isClusterChild =
    currentDrill?.kind === 'cluster-title' &&
    phase === 'active' &&
    currentDrill.childIds.includes(id);
  if (isClusterParent) {
    drillOutline = '2px dashed var(--accent)';
  } else if (isClusterChild) {
    drillOutline = '2px solid rgba(107,138,253,0.45)';
  }

  // Sorter visual states
  const isSorterParent =
    currentDrill?.kind === 'sorter' &&
    phase === 'active' &&
    currentDrill.parentIds.includes(id);
  const isSorterChild = currentDrill?.kind === 'sorter' && currentDrill.childIds.includes(id);
  const sorterAssigned =
    isSorterChild && currentDrill?.kind === 'sorter'
      ? currentDrill.userAssignments[id] !== null
      : false;
  if (isSorterParent) {
    drillOutline = '2px solid var(--accent)';
    drillBoxShadow = '0 0 0 4px rgba(107,138,253,0.20)';
  } else if (isSorterChild && phase === 'active') {
    drillOutline = sorterAssigned ? '2px solid var(--accent)' : '2px dashed var(--text-muted)';
  }

  const sorterBadge =
    currentDrill?.kind === 'sorter' && phase === 'graded' && isSorterChild
      ? currentDrill.userAssignments[id] === currentDrill.truth[id]
        ? '✓'
        : '✗'
      : null;
  const sorterBadgeColor =
    sorterBadge === '✓' ? '#5a7a4a' : '#c0504a';

  // Scenario Builder visual states
  const scenarioPipelineIndex =
    (currentDrill?.kind === 'scenario-builder' &&
      (phase === 'active' || phase === 'graded') &&
      currentDrill.pipeline.indexOf(id)) ?? -1;
  const isInPipeline = scenarioPipelineIndex !== -1 && scenarioPipelineIndex !== false && (scenarioPipelineIndex as number) >= 0;
  if (isInPipeline) {
    drillOutline = '1.5px solid var(--accent)';
  }

  // Debugger subject highlight
  const isDebuggerSubject =
    phase === 'active' &&
    currentDrill?.kind === 'debugger' &&
    id === currentDrill.nodeId;
  if (isDebuggerSubject) {
    drillOutline = '2px solid var(--accent)';
    drillBoxShadow = '0 0 0 4px rgba(107,138,253,0.25)';
  }

  const containerStyle: React.CSSProperties = {
    maxWidth: 280,
    padding: '12px 16px',
    borderRadius: 20,
    background: '#1e1e2e',
    borderLeft: `3px solid ${borderColor}`,
    outline: drillOutline ?? (selected ? '1px solid #6b8afd' : 'none'),
    boxShadow: drillBoxShadow
      ? `${drillBoxShadow}, ${selected ? '0 0 0 3px rgba(107,138,253,0.2), ' : ''}inset 4px 0 6px -4px ${borderColor}`
      : selected
      ? `0 0 0 3px rgba(107,138,253,0.2), inset 4px 0 6px -4px ${borderColor}`
      : `0 2px 8px rgba(0,0,0,0.4), inset 4px 0 6px -4px ${borderColor}`,
    cursor: 'grab',
    position: 'relative',
    transition: 'outline 0.15s, box-shadow 0.15s',
    userSelect: 'none',
  };

  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    fontWeight: 500,
    fontSize: 14,
    color: '#e0e0f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const layerTextStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 11,
    color: 'rgba(220,220,240,0.55)',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  };

  const codeStyle: React.CSSProperties = {
    ...layerTextStyle,
    fontFamily: 'monospace',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 4,
    padding: '2px 4px',
  };

  const separatorStyle: React.CSSProperties = {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    marginTop: 6,
    paddingTop: 6,
  };

  return (
    <div style={containerStyle}>
      {/* Handles */}
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />

      {/* Multi-layer dot indicator */}
      {layerCount > 1 && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 10,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#6b8afd',
          opacity: 0.5,
        }} />
      )}

      {isMissingLinkNode && (
        <div style={{
          position: 'absolute',
          top: 6,
          right: 10,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--accent)',
          lineHeight: 1,
        }}>?</div>
      )}
      {sorterBadge !== null && (
        <div style={{
          position: 'absolute',
          bottom: 6,
          right: 10,
          fontSize: 13,
          fontWeight: 700,
          color: sorterBadgeColor,
          lineHeight: 1,
        }}>{sorterBadge}</div>
      )}
      {isInPipeline && (
        <div style={{
          position: 'absolute',
          top: 6,
          left: 10,
          background: 'var(--accent)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          borderRadius: '50%',
          width: 16,
          height: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}>{(scenarioPipelineIndex as number) + 1}</div>
      )}
      <div style={titleStyle}>
        {isClusterParent && phase === 'active' ? '?' : title}
      </div>

      {showLayer1 && (
        <div style={layer1.contentType === 'code' ? codeStyle : layerTextStyle}>
          {showLayer2
            ? layer1.content
            : truncate(layer1.content, 80)}
        </div>
      )}

      {showLayer2 && (
        <div style={separatorStyle}>
          <div style={layer2.contentType === 'code' ? codeStyle : layerTextStyle}>
            {layer2.content}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(StudyNode);