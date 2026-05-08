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
import { useDrillStore } from '../../store/drillStore';
import { useSessionStore } from '../../store/sessionStore';
import StudyNode from './StudyNode';
import { CanvasContextMenu, type MenuItem } from './CanvasContextMenu';
import { applyEdgeVisual } from '../../utils/edgeStyles';
import PathFinderOverlay from './PathFinderOverlay';
import MissingLinkOverlay from './MissingLinkOverlay';
import ClusterTitleOverlay from './ClusterTitleOverlay';
import SorterOverlay from './SorterOverlay';
import {
  canCloze,
  canDebuggerNode,
  canDebuggerSystem,
  canPathFinder,
  canMissingLink,
  canClusterTitle,
  canSorter,
  canScenarioBuilder,
} from '../../utils/drillEligibility';

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
  const clickPathStep = useDrillStore((s) => s.clickPathStep);
  const assignChild = useDrillStore((s) => s.assignChild);
  const addToPipeline = useDrillStore((s) => s.addToPipeline);
  const drillPhase = useDrillStore((s) => s.phase);
  const currentDrill = useDrillStore((s) => s.currentDrill);
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

  const rfEdges: Edge[] = useMemo(() => {
    const isSorterActive = drillPhase === 'active' && currentDrill?.kind === 'sorter';
    const sorterParentSet = isSorterActive ? new Set(currentDrill.parentIds) : null;
    const sorterChildSet = isSorterActive ? new Set(currentDrill.childIds) : null;
    return edges
      .filter((e) => {
        if (!isSorterActive || !sorterParentSet || !sorterChildSet) return true;
        if (e.type === 'parent-child' && sorterParentSet.has(e.source) && sorterChildSet.has(e.target)) return false;
        return true;
      })
      .map((e) => {
        const base: Edge = {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          selected: e.id === selectedEdgeId,
          data: { type: e.type },
        };
        return applyEdgeVisual(base, e.type);
      });
  }, [edges, selectedEdgeId, drillPhase, currentDrill]);

  const onNodesChange = useCallback((_c: NodeChange[]) => {}, []);
  const onEdgesChange = useCallback((_c: EdgeChange[]) => {}, []);

  const onNodeDragStop = useCallback(
    (_e: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
      updateNode(node.id, { position: node.position });
      // Sorter proximity detection
      if (drillPhase === 'active' && currentDrill?.kind === 'sorter' && currentDrill.childIds.includes(node.id)) {
        const THRESHOLD = 200;
        let closestParentId: string | null = null;
        let closestDist = Infinity;
        for (const parentId of currentDrill.parentIds) {
          const parentNode = nodes.find((n) => n.id === parentId);
          if (!parentNode) continue;
          const dx = node.position.x - parentNode.position.x;
          const dy = node.position.y - parentNode.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closestParentId = parentId;
          }
        }
        assignChild(node.id, closestDist <= THRESHOLD ? closestParentId : null);
      }
    },
    [updateNode, drillPhase, currentDrill, nodes, assignChild]
  );

  const onConnect = useCallback(
    async (conn: Connection) => {
      if (drillPhase === 'active') return;
      if (!conn.source || !conn.target) return;
      if (conn.source === conn.target) return;
      const id = await createEdge({
        source: conn.source,
        target: conn.target,
        type: 'related',
      });
      if (id) selectEdge(id);
    },
    [createEdge, selectEdge, drillPhase]
  );

  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: Node) => {
      if (drillPhase === 'active' && currentDrill?.kind === 'path-finder') {
        clickPathStep(node.id);
        return;
      }
      if (drillPhase === 'active' && currentDrill?.kind === 'scenario-builder' && currentDrill.builderPhase === 'building') {
        addToPipeline(node.id);
        return;
      }
      if (drillPhase === 'active') return;
      selectNode(node.id);
    },
    [selectNode, clickPathStep, addToPipeline, drillPhase, currentDrill]
  );

  const onEdgeClick = useCallback(
    (_e: React.MouseEvent, edge: Edge) => {
      if (drillPhase === 'active' && currentDrill !== null) return;
      selectEdge(edge.id);
    },
    [selectEdge, drillPhase, currentDrill]
  );

  const onPaneClick = useCallback(() => {
    if (drillPhase === 'active') return;
    selectNode(null);
    setMenu(null);
  }, [selectNode, drillPhase, currentDrill]);

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
      if (drillPhase === 'active') return;
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
  }, [selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, drillPhase]);

  const menuItems: MenuItem[] = useMemo(() => {
    if (!menu) return [];

    const graphSnapshot = useGraphStore.getState();
    const menuNodes = graphSnapshot.nodes;
    const menuEdges = graphSnapshot.edges;

    if (menu.kind === 'pane') {
      const pathFinderEligibility = canPathFinder(menuNodes, menuEdges);
      const missingLinkEligibility = canMissingLink(menuNodes);
      const clusterTitleEligibility = canClusterTitle(menuEdges);
      const sorterEligibility = canSorter(menuEdges);
      const scenarioEligibility = canScenarioBuilder(menuNodes);
      const debuggerEligibility = canDebuggerSystem(menuNodes);

      return [
        {
          label: 'Start a session...',
          onClick: () => useSessionStore.getState().openModal(),
        },
        {
          label: 'Start a drill',
          submenu: [
            {
              label: 'Path Finder',
              disabled: !pathFinderEligibility.eligible,
              title: pathFinderEligibility.reason,
              onClick: () => useDrillStore.getState().startPathFinder(),
            },
            {
              label: 'Missing Link',
              disabled: !missingLinkEligibility.eligible,
              title: missingLinkEligibility.reason,
              onClick: () =>
                useDrillStore.getState().startMissingLink(menuNodes, menuEdges),
            },
            {
              label: 'Cluster Title',
              disabled: !clusterTitleEligibility.eligible,
              title: clusterTitleEligibility.reason,
              onClick: () =>
                useDrillStore.getState().startClusterTitle(menuNodes, menuEdges),
            },
            {
              label: 'Sorter',
              disabled: !sorterEligibility.eligible,
              title: sorterEligibility.reason,
              onClick: () =>
                useDrillStore.getState().startSorter(menuNodes, menuEdges),
            },
            {
              label: 'Scenario Builder',
              disabled: !scenarioEligibility.eligible,
              title: scenarioEligibility.reason,
              onClick: () => useDrillStore.getState().startScenarioBuilder(),
            },
            {
              label: 'Debugger (random)',
              disabled: !debuggerEligibility.eligible,
              title: debuggerEligibility.reason,
              onClick: () => useDrillStore.getState().startDebugger(),
            },
          ],
        },
        { separator: true },
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
      const node = menuNodes.find((n) => n.id === nodeId);
      if (!node) return [];

      const clozeEligibility = canCloze(node);
      const debuggerEligibility = canDebuggerNode(node);

      return [
        {
          label: 'Study this node',
          submenu: [
            {
              label: 'Cloze',
              disabled: !clozeEligibility.eligible,
              title: clozeEligibility.reason,
              onClick: () => useDrillStore.getState().startCloze(node),
            },
            {
              label: 'Debugger',
              disabled: !debuggerEligibility.eligible,
              title: debuggerEligibility.reason,
              onClick: () =>
                useDrillStore.getState().startDebugger({ nodeId: node.id }),
            },
          ],
          disabled:
            !clozeEligibility.eligible && !debuggerEligibility.eligible,
          title:
            !clozeEligibility.eligible && !debuggerEligibility.eligible
              ? 'No eligible drills for this node'
              : undefined,
        },
        { separator: true },
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
    <div ref={wrapperRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
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
      <PathFinderOverlay />
      <MissingLinkOverlay />
      <ClusterTitleOverlay />
      <SorterOverlay />
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