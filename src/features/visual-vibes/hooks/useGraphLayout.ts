import { useMemo, useState } from "react";
import { layoutVibeGraph } from "@/lib/visual-vibes/layout/layoutGraph";
import { getErrorGraph, getFlowGraph } from "@/features/visual-vibes/components/editor/editorGraphFilters";
import type { CanvasViewMode, CenterRequest } from "../types";
import type { VibeGraph } from "@/lib/visual-vibes/graph/graphTypes";

/**
 * Hook for managing graph visualization, layout, and view mode.
 * Handles graph filtering by view mode and layout positioning.
 */
export function useGraphLayout(displayGraph: VibeGraph | null) {
  const [canvasViewMode, setCanvasViewMode] = useState<CanvasViewMode>("flow");
  const [centerRequest, setCenterRequest] = useState<CenterRequest>(null);

  // Only the visible graph changes by mode. The full graph is still used for node classification.
  const visibleGraph = useMemo(() => {
    if (!displayGraph) {
      return null;
    }

    if (canvasViewMode === "errors") {
      return getErrorGraph(displayGraph);
    }

    return getFlowGraph(displayGraph);
  }, [displayGraph, canvasViewMode]);

  // Full graph layout supports classification in VibeCanvas, including error/conclusion styling.
  const positionedDisplayGraph = useMemo(() => {
    if (!displayGraph) {
      return { nodes: [], edges: [] };
    }

    return layoutVibeGraph(displayGraph);
  }, [displayGraph]);

  // Current visible graph layout is what the canvas actually draws.
  const positionedGraph = useMemo(() => {
    if (!visibleGraph) {
      return { nodes: [], edges: [] };
    }

    return layoutVibeGraph(visibleGraph, {
      mode: canvasViewMode,
    });
  }, [visibleGraph, canvasViewMode]);

  return {
    canvasViewMode,
    setCanvasViewMode,
    centerRequest,
    setCenterRequest,
    visibleGraph,
    positionedGraph,
    positionedDisplayGraph,
  };
}
