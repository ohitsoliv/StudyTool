// src/components/canvas/GraphCanvas.tsx
import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeMouseHandler,
  OnNodeDrag,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore } from '../../store/graphStore';

function GraphCanvasInner() {
  const { nodes: nodeDocs, edges: edgeDocs, currentGraphId, selectNode, updateNode } = useGraphStore();

  const rfNodes: Node[] = nodeDocs.map(n => ({
    id: n.id,
    position: n.position,
    data: { label: n.title },
  }));

  const rfEdges: Edge[] = edgeDocs.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
  }));

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    selectNode(node.id);
  }, [selectNode]);

  const handleNodeDragStop: OnNodeDrag = useCallback((_event, node) => {
    updateNode(node.id, { position: node.position });
  }, [updateNode]);

  if (!currentGraphId || nodeDocs.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted, #888)' }}>
        No graph selected. Open the sidebar to create or seed one.
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodeClick={handleNodeClick}
      onNodeDragStop={handleNodeDragStop}
      fitView
    >
      <Background />
      <Controls />
    </ReactFlow>
  );
}

export default function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}