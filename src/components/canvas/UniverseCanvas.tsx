// src/components/canvas/UniverseCanvas.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useUniverseStore } from '../../store/universeStore';
import { useGraphStore } from '../../store/graphStore';
import { useViewStore } from '../../store/viewStore';
import GraphCard from './GraphCard';
import { CanvasContextMenu, type MenuItem } from './CanvasContextMenu';
import { applyEdgeVisual } from '../../utils/edgeStyles';
import type { EdgeType } from '../../types/graph';

const nodeTypes = { graph: GraphCard };

const EDGE_TYPES: EdgeType[] = [
  'parent-child',
  'related',
  'prerequisite',
  'sequence',
];

type Menu =
  | { kind: 'pane'; x: number; y: number; flowX: number; flowY: number }
  | { kind: 'node'; x: number; y: number; nodeId: string }
  | { kind: 'edge'; x: number; y: number; edgeId: string }
  | null;

function UniverseCanvasInner() {
  const graphs = useUniverseStore((s) => s.graphs);
  const positions = useUniverseStore((s) => s.positions);
  const universeEdges = useUniverseStore((s) => s.edges);
  const aggregates = useUniverseStore((s) => s.aggregates);
  const selectedEdgeId = useUniverseStore((s) => s.selectedEdgeId);
  const renamingGraphId = useUniverseStore((s) => s.renamingGraphId);
  const loading = useUniverseStore((s) => s.loading);
  const load = useUniverseStore((s) => s.load);
  const setPosition = useUniverseStore((s) => s.setPosition);
  const createUniverseEdge = useUniverseStore((s) => s.createEdge);
  const updateUniverseEdge = useUniverseStore((s) => s.updateEdge);
  const deleteUniverseEdge = useUniverseStore((s) => s.deleteEdge);
  const selectUniverseEdge = useUniverseStore((s) => s.selectEdge);
  const createGraphInUniverse = useUniverseStore(
    (s) => s.createGraphInUniverse,
  );
  const setRenamingGraphId = useUniverseStore((s) => s.setRenamingGraphId);

  const setCurrentGraph = useGraphStore((s) => s.setCurrentGraph);
  const setViewMode = useViewStore((s) => s.setViewMode);

  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void load();
  }, [load]);

  const rfNodes: Node[] = useMemo(
    () =>
      graphs.map((g) => {
        const pos = positions[g.id] ?? { x: 0, y: 0 };
        const aggregate = aggregates[g.id] ?? {
          mean: 0,
          nodeCount: 0,
          reviewedCount: 0,
        };
        return {
          id: g.id,
          type: 'graph',
          position: pos,
          data: {
            name: g.name,
            semester: g.semester ?? null,
            tags: g.tags ?? [],
            aggregate,
          },
          // Lock dragging while renaming so input clicks don't start a drag
          draggable: renamingGraphId !== g.id,
        } as Node;
      }),
    [graphs, positions, aggregates, renamingGraphId],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      universeEdges.map((e) => {
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
    [universeEdges, selectedEdgeId],
  );

  const onNodesChange = useCallback((_c: NodeChange[]) => {}, []);
  const onEdgesChange = useCallback((_c: EdgeChange[]) => {}, []);

  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
      void setPosition(node.id, node.position);
    },
    [setPosition],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      if (conn.source === conn.target) return;
      void createUniverseEdge(conn.source, conn.target, 'related');
    },
    [createUniverseEdge],
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      // Ignore click on a card that's currently being renamed
      if (renamingGraphId === node.id) return;
      // Clear stray rename state on a different card
      if (renamingGraphId !== null) setRenamingGraphId(null);
      setCurrentGraph(node.id);
      setViewMode('canvas');
    },
    [renamingGraphId, setRenamingGraphId, setCurrentGraph, setViewMode],
  );

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      selectUniverseEdge(edge.id);
    },
    [selectUniverseEdge],
  );

  const onPaneClick = useCallback(() => {
    if (selectedEdgeId) selectUniverseEdge(null);
    if (renamingGraphId) setRenamingGraphId(null);
    setMenu(null);
  }, [
    selectedEdgeId,
    selectUniverseEdge,
    renamingGraphId,
    setRenamingGraphId,
  ]);

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      setMenu({
        kind: 'pane',
        x: event.clientX,
        y: event.clientY,
        flowX: flowPos.x,
        flowY: flowPos.y,
      });
    },
    [screenToFlowPosition],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setMenu({
        kind: 'node',
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setMenu({
        kind: 'edge',
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    [],
  );

  const menuItems: MenuItem[] = useMemo(() => {
    if (!menu) return [];

    if (menu.kind === 'pane') {
      const flowX = menu.flowX;
      const flowY = menu.flowY;
      return [
        {
          label: 'New Class',
          onClick: () => {
            void createGraphInUniverse('New Class', { x: flowX, y: flowY });
          },
        },
      ];
    }

    if (menu.kind === 'node') {
      const nodeId = menu.nodeId;
      return [
        {
          label: 'Open',
          onClick: () => {
            setCurrentGraph(nodeId);
            setViewMode('canvas');
          },
        },
        {
          label: 'Rename',
          onClick: () => {
            setRenamingGraphId(nodeId);
          },
        },
      ];
    }

    if (menu.kind === 'edge') {
      const edgeId = menu.edgeId;
      return [
        {
          label: 'Change type',
          submenu: EDGE_TYPES.map((t) => ({
            label: t,
            onClick: () => {
              void updateUniverseEdge(edgeId, { type: t });
            },
          })),
        },
        { separator: true },
        {
          label: 'Delete',
          destructive: true,
          onClick: () => {
            void deleteUniverseEdge(edgeId);
          },
        },
      ];
    }

    return [];
  }, [
    menu,
    createGraphInUniverse,
    setCurrentGraph,
    setViewMode,
    setRenamingGraphId,
    updateUniverseEdge,
    deleteUniverseEdge,
  ]);

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        Loading universe…
      </div>
    );
  }

  if (graphs.length === 0) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 14,
          textAlign: 'center',
          padding: 32,
          lineHeight: 1.6,
        }}
      >
        No classes yet. Right-click to create one,
        <br />
        or create graphs from the sidebar.
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
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

export default function UniverseCanvas() {
  return (
    <ReactFlowProvider>
      <UniverseCanvasInner />
    </ReactFlowProvider>
  );
}
