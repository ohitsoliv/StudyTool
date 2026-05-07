import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useStore,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGraphStore } from '../../store/graphStore';
import StudyNode from './StudyNode';
import type { NodeDoc } from '../../types/graph';

const nodeTypes = { study: StudyNode };

// TODO: throttle zoom updates if re-rendering all nodes on zoom becomes a perf
// issue at >50 nodes. Consider useThrottle(zoomLevel, 100) or deriving zoom
// only at zoom threshold boundaries (1.2, 2.0) to minimize rerenders.

function toFlowNode(doc: NodeDoc, zoomLevel: number): Node {
  return {
    id: doc.id,
    type: 'study',
    position: doc.position,
    data: {
      title: doc.title,
      mastery: doc.mastery?.score ?? 0,
      layerCount: doc.layers?.length ?? 0,
      layers: doc.layers ?? [],
      zoomLevel,
    },
  };
}

function toFlowEdge(edge: { id: string; source: string; target: string; type?: string }): Edge {
  return { id: edge.id, source: edge.source, target: edge.target };
}

export default function GraphCanvas() {
  const { nodes: nodeDocs, edges: edgeDocs, selectNode, updateNode } = useGraphStore();

  // Subscribe to viewport zoom from React Flow internal store
  const zoomLevel = useStore((s) => s.transform[2]);

  const flowNodes = nodeDocs.map((n) => toFlowNode(n, zoomLevel));
  const flowEdges = edgeDocs.map(toFlowEdge);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      updateNode(node.id, { position: node.position });
    },
    [updateNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        fitView
      >
        <Background color="rgba(255,255,255,0.06)" gap={20} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}