import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useStore,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Timestamp } from 'firebase/firestore';
import { useGraphStore } from '../../store/graphStore';
import StudyNode from './StudyNode';
import { CanvasContextMenu, type MenuItem } from './CanvasContextMenu';
import { applyEdgeVisual } from '../../utils/edgeStyles';

const nodeTypes = { study: StudyNode };

type Menu =
  | { kind: 'pane'; x: number; y: number; flowX: number; flowY: number }
  | { kind: 'node'; x: number; y: number; nodeId: string }
  | { kind: 'edge'; x: number; y: number; edgeId: string }
  | null;

function GraphCanvasInner() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const currentGraphId = useGraphStore((s) => s.currentGraphId);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const selectedEdgeId = useGraphStore((s) => s.selectedEdgeId);
  const selectNode = useGraphStore((s) => s.selectNode);
  const selectEdge = useGraphStore((s) => s.selectEdge);
  const createNode = useGraphStore((s) => s.createNode);
  const createEdge = useGraphStore((s) => s.createEdge);
  const updateNode = useGraphStore((s) => s.updateNode);
  const updateEdge = useGraphStore((s) => s.updateEdge);
  const deleteNode = useGraphStore((s) => s.deleteNode);
  const deleteEdge = useGraphStore((s) => s.deleteEdge);

  const { screenToFlowPosition } = useReactFlow();
  const zoomLevel = useStore((s) => s.transform[2]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu>(null);

  const rfNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: 'study',
        position: n.position,
        data: {
          title: n.title,
          mastery: n.mastery?.score ?? 0,
          layerCount: n.layers?.length ?? 0,
          layers: n.layers ?? [],
          zoomLevel,
        },
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId, zoomLevel]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => {
        const base: Edge = {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          selected: e.id === selectedEdgeId,
          data: { type: e.type },
        };
        return applyEdgeVisual(base, e.type);
      }),
    [edges, selectedEdgeId]
  );

  const onNodesChange = useCallback((_c: NodeChange[]) => {}, []);
  const onEdgesChange = useCallback((_c: EdgeChange[]) => {}, []);

  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
      updateNode(node.id, { position: node.position });
    },
    [updateNode]
  );

  const onConnect = useCallback(
    async (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      if (conn.source === conn.target) return;
      const id = await createEdge({
        source: conn.source,
        target: conn.target,
        type: 'related',
      });
      if (id) selectEdge(id);
    },
    [createEdge, selectEdge]
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => selectNode(node.id),
    [selectNode]
  );

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => selectEdge(edge.id),
    [selectEdge]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setMenu(null);
  }, [selectNode]);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setMenu({
        kind: 'pane',
        x: event.clientX,
        y: event.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition]
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setMenu({ kind: 'node', x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    []
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setMenu({ kind: 'edge', x: event.clientX, y: event.clientY, edgeId: edge.id });
    },
    []
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const ae = document.activeElement as HTMLElement | null;
      if (ae) {
        const tag = ae.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (ae.isContentEditable) return;
      }
      if (selectedEdgeId) {
        deleteEdge(selectedEdgeId);
      } else if (selectedNodeId) {
        if (window.confirm('Delete this node and its connections?')) {
          deleteNode(selectedNodeId);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge]);

  const menuItems: MenuItem[] = useMemo(() => {
    if (!menu) return [];

    if (menu.kind === 'pane') {
      return [
        {
          label: 'New Node Here',
          onClick: async () => {
            if (!currentGraphId) return;
            const id = await createNode({
              title: 'New Node',
              position: { x: menu.flowX, y: menu.flowY },
              layers: [
                {
                  depth: 1 as const,
                  content: '',
                  contentType: 'text' as const,
                  createdAt: Timestamp.now(),
                },
              ],
              tags: [],
              mastery: { score: 0, lastReviewedAt: null, reviewCount: 0 },
              archived: false,
              clusterId: null,
              accessCount: 0,
              lastAccessedAt: null,
            });
            if (id) selectNode(id);
          },
        },
      ];
    }

    if (menu.kind === 'node') {
      const nodeId = menu.nodeId;
      return [
        { label: 'Edit', onClick: () => selectNode(nodeId) },
        {
          label: 'Add Connected Node',
          onClick: async () => {
            const src = nodes.find((n) => n.id === nodeId);
            if (!src) return;
            const newId = await createNode({
              title: 'New Node',
              position: { x: src.position.x + 240, y: src.position.y },
              layers: [
                {
                  depth: 1 as const,
                  content: '',
                  contentType: 'text' as const,
                  createdAt: Timestamp.now(),
                },
              ],
              tags: [],
              mastery: { score: 0, lastReviewedAt: null, reviewCount: 0 },
              archived: false,
              clusterId: null,
              accessCount: 0,
              lastAccessedAt: null,
            });
            if (newId) {
              await createEdge({ source: nodeId, target: newId, type: 'related' });
              selectNode(newId);
            }
          },
        },
        {
          label: 'Duplicate',
          onClick: async () => {
            const src = nodes.find((n) => n.id === nodeId);
            if (!src) return;
            const newId = await createNode({
              title: `${src.title} (copy)`,
              position: { x: src.position.x + 40, y: src.position.y + 40 },
              layers: src.layers.map((l) => ({ ...l, createdAt: Timestamp.now() })),
              tags: [...src.tags],
              mastery: { score: 0, lastReviewedAt: null, reviewCount: 0 },
              archived: false,
              clusterId: null,
              accessCount: 0,
              lastAccessedAt: null,
            });
            if (newId) selectNode(newId);
          },
        },
        { separator: true },
        {
          label: 'Delete',
          destructive: true,
          onClick: () => {
            if (window.confirm('Delete this node and its connections?')) {
              deleteNode(nodeId);
            }
          },
        },
      ];
    }

    if (menu.kind === 'edge') {
      const edgeId = menu.edgeId;
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) return [];
      return [
        { label: 'Edit', onClick: () => selectEdge(edgeId) },
        {
          label: 'Reverse Direction',
          onClick: () =>
            updateEdge(edgeId, { source: edge.target, target: edge.source }),
        },
        { separator: true },
        {
          label: 'Delete',
          destructive: true,
          onClick: () => deleteEdge(edgeId),
        },
      ];
    }

    return [];
  }, [
    menu,
    currentGraphId,
    nodes,
    edges,
    createNode,
    createEdge,
    deleteNode,
    deleteEdge,
    updateEdge,
    selectNode,
    selectEdge,
  ]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(255,255,255,0.06)" gap={20} size={1} />
        <Controls />
      </ReactFlow>
      {menu && (
        <CanvasContextMenu
          x={menu.x}
          y={menu.y}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

export function GraphCanvas() {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner />
    </ReactFlowProvider>
  );
}

export default GraphCanvas;