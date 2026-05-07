import { MarkerType, type Edge } from "@xyflow/react";
import type { EdgeType } from "../types/graph";

interface EdgeVisual {
  style: React.CSSProperties;
  animated: boolean;
  markerEnd?: { type: MarkerType; color: string; width: number; height: number };
}

export const edgeVisuals: Record<EdgeType, EdgeVisual> = {
  "parent-child": {
    style: { stroke: "#9a9a9f", strokeWidth: 1.5 },
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#9a9a9f", width: 18, height: 18 },
  },
  "prerequisite": {
    style: { stroke: "#d4924a", strokeWidth: 1.5, strokeDasharray: "6 4" },
    animated: false,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#d4924a", width: 18, height: 18 },
  },
  "related": {
    style: { stroke: "#6b8afd", strokeWidth: 1, opacity: 0.55 },
    animated: false,
  },
  "sequence": {
    style: { stroke: "#5a7a4a", strokeWidth: 1.5 },
    animated: true,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#5a7a4a", width: 18, height: 18 },
  },
};

export function applyEdgeVisual(edge: Edge, edgeType: EdgeType): Edge {
  const v = edgeVisuals[edgeType];
  return {
    ...edge,
    style: v.style,
    animated: v.animated,
    markerEnd: v.markerEnd,
  };
}