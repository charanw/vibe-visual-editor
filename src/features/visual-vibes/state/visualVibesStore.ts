import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  CanvasViewMode,
  CenterRequest,
} from "../types";
import { layoutVibeGraph } from "@/lib/visual-vibes/layout/layoutGraph";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
} from "@/lib/visual-vibes/layout/layoutTypes";
import type {
  PositionedVibeGraph,
  PositionedVibeNode,
} from "@/lib/visual-vibes/layout/layoutTypes";
import type { VibeGraph, VibeGraphEdge } from "@/lib/visual-vibes/graph/graphTypes";
import { getErrorGraph, getFlowGraph } from "../components/editor/editorGraphFilters";
import { calculateGridTemplateColumns } from "../utils";
import { useEditorHistory } from "./editorHistory";
import {
  selectParsedVibeState,
  selectSelectedStepDescription,
  selectValidationIssues,
} from "./editorSelectors";

export type MobilePaneId = "source" | "canvas" | "inspector";
export type MobileCollapsedPanes = Record<MobilePaneId, boolean>;
export type ActivePanel = "source" | "canvas" | "inspector";
export type CanvasViewportState = {
  zoom: number;
  pan: {
    x: number;
    y: number;
  };
};

type SourceType = "default" | "upload" | "example";

/**
 * Central editor state for Visual Vibes.
 *
 * Domain state owns YAML, parsed workflow, validation, and graph data. UI state
 * owns selection, panel visibility, viewport intent, and edit modes.
 */
export function useVisualVibesStore() {
  const yamlHistory = useEditorHistory("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>("default");
  const [selectedExampleName, setSelectedExampleName] = useState<string | null>(
    null,
  );
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedIssueIndex, setSelectedIssueIndex] = useState<number | null>(
    null,
  );
  const [activePanel, setActivePanel] = useState<ActivePanel>("canvas");
  const [canvasViewMode, setCanvasViewMode] =
    useState<CanvasViewMode>("flow");
  const [centerRequest, setCenterRequest] = useState<CenterRequest>(null);
  const [canvasViewport, setCanvasViewport] = useState<CanvasViewportState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  });

  const [leftPaneWidth, setLeftPaneWidth] = useState(440);
  const [rightPaneWidth, setRightPaneWidth] = useState(360);
  const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = useState(false);
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState(false);
  const [mobileCollapsedPanes, setMobileCollapsedPanes] =
    useState<MobileCollapsedPanes>({
      source: false,
      canvas: false,
      inspector: false,
    });
  const [isDesktopLayout, setIsDesktopLayout] = useState(true);

  const [isCanvasEditing, setIsCanvasEditing] = useState(true);
  const [canvasEditSnapshot, setCanvasEditSnapshot] = useState<string | null>(
    null,
  );
  const [hasUnsavedStepEdits, setHasUnsavedStepEdits] = useState(false);
  const [isYamlEditing, setIsYamlEditing] = useState(true);
  const [yamlEditSnapshot, setYamlEditSnapshot] = useState<string | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    function updateIsDesktopLayout() {
      setIsDesktopLayout(mediaQuery.matches);
    }

    updateIsDesktopLayout();
    mediaQuery.addEventListener("change", updateIsDesktopLayout);

    return () => {
      mediaQuery.removeEventListener("change", updateIsDesktopLayout);
    };
  }, []);

  const parsedResult = useMemo(
    () => selectParsedVibeState(yamlHistory.value),
    [yamlHistory.value],
  );
  const validationIssues = useMemo(
    () => selectValidationIssues(yamlHistory.value),
    [yamlHistory.value],
  );
  const selectedStepDescription = useMemo(
    () => selectSelectedStepDescription(yamlHistory.value, selectedStepId),
    [yamlHistory.value, selectedStepId],
  );
  const graphLayout = useGraphLayoutState(
    parsedResult.graph,
    canvasViewMode,
    isCanvasEditing,
  );

  const gridTemplateColumns = calculateGridTemplateColumns(
    leftPaneWidth,
    isLeftPaneCollapsed,
  );

  const domainState = {
    yamlText: yamlHistory.value,
    setYamlText: yamlHistory.setValue,
    resetYamlText: yamlHistory.reset,
    markYamlClean: yamlHistory.markClean,
    discardYamlChanges: yamlHistory.discardChanges,
    canUndoYaml: yamlHistory.canUndo,
    canRedoYaml: yamlHistory.canRedo,
    yamlHistoryItems: yamlHistory.historyItems,
    undoYaml: yamlHistory.undo,
    redoYaml: yamlHistory.redo,
    isYamlDirty: yamlHistory.isDirty,
    fileName,
    setFileName,
    sourceType,
    setSourceType,
    selectedExampleName,
    setSelectedExampleName,
    loadError,
    setLoadError,
    parsedResult,
    validationIssues,
    graph: parsedResult.graph,
    workflow: parsedResult.vibe?.workflow ?? null,
  };

  const uiState = {
    selectedStepId,
    setSelectedStepId,
    selectedStepDescription,
    selectedIssueIndex,
    setSelectedIssueIndex,
    activePanel,
    setActivePanel,
    canvasViewMode,
    setCanvasViewMode,
    centerRequest,
    setCenterRequest,
    canvasViewport,
    setCanvasViewport,
    leftPaneWidth,
    setLeftPaneWidth,
    rightPaneWidth,
    setRightPaneWidth,
    isLeftPaneCollapsed,
    setIsLeftPaneCollapsed,
    isRightPaneCollapsed,
    setIsRightPaneCollapsed,
    isDesktopLayout,
    mobileCollapsedPanes,
    setMobileCollapsedPanes,
    shouldRenderMobileSourcePane: !mobileCollapsedPanes.source,
    shouldRenderMobileCanvasPane: !mobileCollapsedPanes.canvas,
    shouldRenderMobileInspectorPane: !mobileCollapsedPanes.inspector,
    gridTemplateColumns,
  };

  const editingState = {
    isCanvasEditing,
    setIsCanvasEditing,
    canvasEditSnapshot,
    setCanvasEditSnapshot,
    hasUnsavedStepEdits,
    setHasUnsavedStepEdits,
    isYamlEditing,
    setIsYamlEditing,
    yamlEditSnapshot,
    setYamlEditSnapshot,
    isDirty: yamlHistory.isDirty || hasUnsavedStepEdits,
  };

  return {
    domainState,
    uiState,
    editingState,
    graphLayout: {
      ...graphLayout,
      canvasViewMode,
      setCanvasViewMode,
      centerRequest,
      setCenterRequest,
    },

    // Compatibility slices used while panes/actions migrate to the store shape.
    vibeState: {
      ...domainState,
      selectedStepId,
      setSelectedStepId,
      selectedStepDescription,
    },
    layoutState: uiState,
  };
}

function useGraphLayoutState(
  displayGraph: VibeGraph | null,
  canvasViewMode: CanvasViewMode,
  isCanvasEditing: boolean,
) {
  const [positionedDisplayGraph, setPositionedDisplayGraph] =
    useState<PositionedVibeGraph>({ nodes: [], edges: [] });
  const [positionedGraph, setPositionedGraph] =
    useState<PositionedVibeGraph>({ nodes: [], edges: [] });
  const displayLayoutKeyRef = useRef<string | null>(null);
  const visibleLayoutKeyRef = useRef<string | null>(null);
  const visibleGraph = useMemo(() => {
    if (!displayGraph) {
      return null;
    }

    if (canvasViewMode === "errors") {
      return getErrorGraph(displayGraph);
    }

    return getFlowGraph(displayGraph);
  }, [displayGraph, canvasViewMode]);
  const layoutDirection = "TB";

  useEffect(() => {
    if (isCanvasEditing) {
      let isStale = false;
      const displayLayoutKey = String(layoutDirection);

      Promise.resolve().then(() => {
        if (!isStale) {
          setPositionedDisplayGraph((currentGraph) => {
            if (!displayGraph) {
              return { nodes: [], edges: [] };
            }

            if (
              currentGraph.nodes.length === 0 ||
              displayLayoutKeyRef.current !== displayLayoutKey ||
              shouldDiscardStableLayout(displayGraph, currentGraph)
            ) {
              displayLayoutKeyRef.current = displayLayoutKey;

              void layoutVibeGraph(displayGraph, { direction: layoutDirection })
                .then((nextGraph) => {
                  if (!isStale) {
                    setPositionedDisplayGraph(nextGraph);
                  }
                })
                .catch(() => {
                  if (!isStale) {
                    setPositionedDisplayGraph({ nodes: [], edges: [] });
                  }
                });

              return { nodes: [], edges: [] };
            }

            return mergeGraphIntoStableLayout(displayGraph, currentGraph);
          });
        }
      });

      return () => {
        isStale = true;
      };
    }

    let isStale = false;
    const layoutPromise = displayGraph
      ? layoutVibeGraph(displayGraph, { direction: layoutDirection })
      : Promise.resolve({ nodes: [], edges: [] } satisfies PositionedVibeGraph);

    layoutPromise
      .then((nextGraph) => {
        if (!isStale) {
          setPositionedDisplayGraph(nextGraph);
        }
      })
      .catch(() => {
        if (!isStale) {
          setPositionedDisplayGraph({ nodes: [], edges: [] });
        }
      });

    return () => {
      isStale = true;
    };
  }, [displayGraph, isCanvasEditing, layoutDirection]);

  useEffect(() => {
    if (isCanvasEditing) {
      let isStale = false;
      const visibleLayoutKey = `${canvasViewMode}:${layoutDirection}`;

      Promise.resolve().then(() => {
        if (!isStale) {
          setPositionedGraph((currentGraph) => {
            if (!visibleGraph) {
              return { nodes: [], edges: [] };
            }

            if (
              currentGraph.nodes.length === 0 ||
              visibleLayoutKeyRef.current !== visibleLayoutKey ||
              shouldDiscardStableLayout(visibleGraph, currentGraph)
            ) {
              visibleLayoutKeyRef.current = visibleLayoutKey;

              void layoutVibeGraph(visibleGraph, {
                mode: canvasViewMode,
                direction: layoutDirection,
              })
                .then((nextGraph) => {
                  if (!isStale) {
                    setPositionedGraph(nextGraph);
                  }
                })
                .catch(() => {
                  if (!isStale) {
                    setPositionedGraph({ nodes: [], edges: [] });
                  }
                });

              return { nodes: [], edges: [] };
            }

            return mergeGraphIntoStableLayout(visibleGraph, currentGraph);
          });
        }
      });

      return () => {
        isStale = true;
      };
    }

    let isStale = false;
    const layoutPromise = visibleGraph
      ? layoutVibeGraph(visibleGraph, {
          mode: canvasViewMode,
          direction: layoutDirection,
        })
      : Promise.resolve({ nodes: [], edges: [] } satisfies PositionedVibeGraph);

    layoutPromise
      .then((nextGraph) => {
        if (!isStale) {
          setPositionedGraph(nextGraph);
        }
      })
      .catch(() => {
        if (!isStale) {
          setPositionedGraph({ nodes: [], edges: [] });
        }
      });

    return () => {
      isStale = true;
    };
  }, [visibleGraph, canvasViewMode, isCanvasEditing, layoutDirection]);

  return {
    visibleGraph,
    positionedGraph,
    positionedDisplayGraph,
  };
}

function shouldDiscardStableLayout(
  graph: VibeGraph,
  currentGraph: PositionedVibeGraph,
) {
  if (graph.nodes.length === 0 || currentGraph.nodes.length === 0) {
    return false;
  }

  const currentNodeIds = new Set(currentGraph.nodes.map((node) => node.id));
  const sharedNodeCount = graph.nodes.filter((node) =>
    currentNodeIds.has(node.id),
  ).length;
  const overlapRatio =
    sharedNodeCount / Math.min(graph.nodes.length, currentGraph.nodes.length);

  return overlapRatio < 0.5;
}

function mergeGraphIntoStableLayout(
  graph: VibeGraph,
  currentGraph: PositionedVibeGraph,
): PositionedVibeGraph {
  const currentNodeById = new Map(
    currentGraph.nodes.map((node) => [node.id, node] as const),
  );
  const nodes = graph.nodes.map((node, index) => {
    const currentNode = currentNodeById.get(node.id);
    const fallbackPosition = getFallbackNodePosition(currentGraph, index);

    return {
      id: node.id,
      functionName: node.functionName,
      kind: node.kind,
      memberCount: node.memberCount,
      semantic: node.semantic,
      x: currentNode?.x ?? fallbackPosition.x,
      y: currentNode?.y ?? fallbackPosition.y,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));
  const currentEdgeById = new Map(
    currentGraph.edges.map((edge) => [edge.id, edge] as const),
  );
  const edges = graph.edges
    .map((edge) => {
      const currentEdge = currentEdgeById.get(edge.id);

      if (currentEdge) {
        return {
          ...currentEdge,
          type: edge.type,
          inferred: edge.inferred,
          semantic: edge.semantic,
        };
      }

      return createStablePositionedEdge(edge, nodeById);
    })
    .filter((edge): edge is PositionedVibeGraph["edges"][number] =>
      Boolean(edge),
    );

  return {
    nodes,
    edges,
    lanes: currentGraph.lanes,
  };
}

function getFallbackNodePosition(
  currentGraph: PositionedVibeGraph,
  nodeIndex: number,
) {
  if (currentGraph.nodes.length === 0) {
    return {
      x: 80 + nodeIndex * (NODE_WIDTH + 118),
      y: 80,
    };
  }

  const maxX = Math.max(...currentGraph.nodes.map((node) => node.x));
  const minY = Math.min(...currentGraph.nodes.map((node) => node.y));

  return {
    x: maxX + NODE_WIDTH + 118,
    y: minY,
  };
}

function createStablePositionedEdge(
  edge: VibeGraphEdge,
  nodeById: Map<string, PositionedVibeNode>,
): PositionedVibeGraph["edges"][number] | null {
  const sourceNode = nodeById.get(edge.source);
  const targetNode = nodeById.get(edge.target);

  if (!sourceNode || !targetNode) {
    return null;
  }

  const route = getStableEdgeRoute(edge, sourceNode, targetNode);

  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    inferred: edge.inferred,
    semantic: edge.semantic,
    sourceX: route.source.x,
    sourceY: route.source.y,
    targetX: route.target.x,
    targetY: route.target.y,
    bendPoints: route.bendPoints,
  };
}

function getStableEdgeRoute(
  edge: VibeGraphEdge,
  source: PositionedVibeNode,
  target: PositionedVibeNode,
) {
  const sourceCenter = getStableNodeCenter(source);
  const targetCenter = getStableNodeCenter(target);
  const verticalGap = target.y - (source.y + NODE_HEIGHT);
  const horizontalGap = target.x - (source.x + NODE_WIDTH);
  const reverseHorizontalGap = source.x - (target.x + NODE_WIDTH);

  if (verticalGap >= 24) {
    const sourcePoint = { x: sourceCenter.x, y: source.y + NODE_HEIGHT };
    const targetPoint = { x: targetCenter.x, y: target.y };

    return {
      source: sourcePoint,
      target: targetPoint,
      bendPoints: getStableDownstreamBendPoints(sourcePoint, targetPoint),
    };
  }

  if (horizontalGap >= 24) {
    const sourcePoint = { x: source.x + NODE_WIDTH, y: sourceCenter.y };
    const targetPoint = { x: target.x, y: targetCenter.y };

    return {
      source: sourcePoint,
      target: targetPoint,
      bendPoints: getStableHorizontalBendPoints(sourcePoint, targetPoint),
    };
  }

  if (reverseHorizontalGap >= 24) {
    const sourcePoint = { x: source.x, y: sourceCenter.y };
    const targetPoint = { x: target.x + NODE_WIDTH, y: targetCenter.y };

    return {
      source: sourcePoint,
      target: targetPoint,
      bendPoints: getStableHorizontalBendPoints(sourcePoint, targetPoint),
    };
  }

  const routeDirection = edge.type === "error" ? -1 : 1;
  const laneOffset = getStableBackEdgeLaneOffset(edge);
  const sideX =
    routeDirection > 0
      ? Math.max(source.x + NODE_WIDTH, target.x + NODE_WIDTH) + 72 + laneOffset
      : Math.min(source.x, target.x) - 72 - laneOffset;
  const sourcePoint = {
    x: routeDirection > 0 ? source.x + NODE_WIDTH : source.x,
    y: sourceCenter.y,
  };
  const targetPoint = {
    x: routeDirection > 0 ? target.x + NODE_WIDTH : target.x,
    y: targetCenter.y,
  };

  return {
    source: sourcePoint,
    target: targetPoint,
    bendPoints: [
      { x: sideX, y: sourcePoint.y },
      { x: sideX, y: targetPoint.y },
    ],
  };
}

function getStableNodeCenter(node: PositionedVibeNode) {
  return {
    x: node.x + NODE_WIDTH / 2,
    y: node.y + NODE_HEIGHT / 2,
  };
}

function getStableDownstreamBendPoints(
  source: { x: number; y: number },
  target: { x: number; y: number },
) {
  if (Math.abs(source.x - target.x) < 2) {
    return undefined;
  }

  const middleY = source.y + (target.y - source.y) / 2;

  return [
    { x: source.x, y: middleY },
    { x: target.x, y: middleY },
  ];
}

function getStableHorizontalBendPoints(
  source: { x: number; y: number },
  target: { x: number; y: number },
) {
  if (Math.abs(source.y - target.y) < 2) {
    return undefined;
  }

  const middleX = source.x + (target.x - source.x) / 2;

  return [
    { x: middleX, y: source.y },
    { x: middleX, y: target.y },
  ];
}

function getStableBackEdgeLaneOffset(edge: VibeGraphEdge) {
  const hash = Array.from(`${edge.source}:${edge.target}:${edge.type}`).reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  );

  return [0, 28, 56][hash % 3];
}

export type VisualVibesStore = ReturnType<typeof useVisualVibesStore>;
export type DomainState = VisualVibesStore["domainState"];
export type UiState = VisualVibesStore["uiState"];
export type EditingState = VisualVibesStore["editingState"];
export type GraphLayoutState = VisualVibesStore["graphLayout"];
export type YamlTextSetter = Dispatch<SetStateAction<string>>;
