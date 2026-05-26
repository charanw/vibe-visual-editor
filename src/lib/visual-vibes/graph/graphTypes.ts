/** Graph node consumed by layout and canvas rendering code. */
export type VibeGraphNode = {
  id: string;
  functionName: string;
  kind?: "step" | "errorHub";
  memberCount?: number;
};

/** Directed relationship between two Vibe steps. */
export type VibeGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: "data" | "next" | "error";
};

/** Minimal graph model derived from a parsed Vibe workflow. */
export type VibeGraph = {
  nodes: VibeGraphNode[];
  edges: VibeGraphEdge[];
};
