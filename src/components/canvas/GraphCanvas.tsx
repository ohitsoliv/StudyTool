import { useCallback } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes = [
  {
    id: "1",
    position: { x: 250, y: 200 },
    data: { label: "Hello Nexus" },
    style: {
      background: "#16161a",
      color: "#e8e8ea",
      border: "1px solid #6b8afd",
      borderRadius: "8px",
      padding: "12px 20px",
      fontSize: "14px",
    },
  },
];

const initialEdges: never[] = [];

export default function GraphCanvas(): JSX.Element {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div style={{ width: "100%", height: "100%", background: "#0d0d0f" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        colorMode="dark"
      >
        <Background
          color="#2a2a2f"
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
}
