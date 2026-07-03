/** Graph node consumed by layout and canvas rendering code. */
export type VibeGraphNode = {
  id: string;
  functionName: string;
  kind?: "step" | "errorHub";
  memberCount?: number;
  semantic?: {
    kind?: "conditional" | "loop" | "loopStep" | "subworkflow" | "terminal";
    badge?: "IF" | "LOOP" | "EACH" | "FLOW" | "END";
    conditionExpression?: string;
    conditionMode?: "if" | "switch";
    inputPreview?: string[];
    outputPreview?: string[];
    loopItemsPreview?: string;
    loopStepIds?: string[];
    loopParentId?: string;
    loopStepLabel?: string;
    parallelLaneIndex?: number;
    parallelLaneLabel?: string;
    isParallelLaneStart?: boolean;
  };
};

/** Directed relationship between two Vibe steps. */
export type VibeGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: "data" | "next" | "error" | "semantic";
  inferred?: boolean;
  semantic?: {
    label?: string;
  };
};

/** Minimal graph model derived from a parsed Vibe workflow. */
export type VibeGraph = {
  nodes: VibeGraphNode[];
  edges: VibeGraphEdge[];
};
