import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { Layer } from '../../types/graph';
import { masteryToColor } from '../../utils/masteryColor';

export interface StudyNodeData {
  title: string;
  mastery: number;
  layerCount: number;
  layers: Layer[];
  zoomLevel: number;
}

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

function StudyNode({ data, selected }: NodeProps) {
  const { title, mastery, layerCount, layers, zoomLevel } = data as StudyNodeData;
  const borderColor = masteryToColor(mastery);
  const layer1 = layers?.[0];
  const layer2 = layers?.[1];

  const showLayer1 = zoomLevel >= 1.2 && layer1;
  const showLayer2 = zoomLevel >= 2.0 && layer2;

  const containerStyle: React.CSSProperties = {
    maxWidth: 280,
    padding: '12px 16px',
    borderRadius: 20,
    background: '#1e1e2e',
    borderLeft: `3px solid ${borderColor}`,
    outline: selected ? '1px solid #6b8afd' : 'none',
    boxShadow: selected
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

      <div style={titleStyle}>{title}</div>

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