import type { VibeGraphEdge, VibeGraphNode } from "../graph/graphTypes";

/** Graph node with absolute SVG/canvas coordinates. */
export type PositionedVibeNode = {
  id: string;
  functionName: string;
  kind?: VibeGraphNode["kind"];
  memberCount?: number;
  semantic?: VibeGraphNode["semantic"];
  x: number;
  y: number;
};

/** Graph edge with concrete connection points on its source and target nodes. */
export type PositionedVibeEdge = {
  id: string;
  source: string;
  target: string;
  type: VibeGraphEdge["type"];
  semantic?: VibeGraphEdge["semantic"];
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

/** Subtle swimlane region rendered behind a parallel path. */
export type PositionedVibeLane = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Fully positioned graph consumed by the canvas renderer. */
export type PositionedVibeGraph = {
  nodes: PositionedVibeNode[];
  edges: PositionedVibeEdge[];
  lanes?: PositionedVibeLane[];
};

/** Layout strategy selected by the canvas view mode. */
export type VibeGraphLayoutMode = "flow" | "errors";

/** Direction selected by the canvas layout control. */
export type VibeGraphLayoutDirection = "LR" | "TB";

/** Shared node width used by layout and SVG rendering. */
export const NODE_WIDTH = 220;

/** Shared node height used by layout and SVG rendering. */
export const NODE_HEIGHT = 110;
