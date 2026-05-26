import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  CanvasLayoutDirection,
  CanvasViewMode,
  CenterRequest,
} from "../types";
import { layoutVibeGraph } from "@/lib/visual-vibes/layout/layoutGraph";
import type { VibeGraph } from "@/lib/visual-vibes/graph/graphTypes";
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
  const [layoutDirection, setLayoutDirection] =
    useState<CanvasLayoutDirection>("LR");
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
  const [isDesktopLayout, setIsDesktopLayout] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.matchMedia("(min-width: 1024px)").matches;
  });

  const [isCanvasEditing, setIsCanvasEditing] = useState(false);
  const [canvasEditSnapshot, setCanvasEditSnapshot] = useState<string | null>(
    null,
  );
  const [hasUnsavedStepEdits, setHasUnsavedStepEdits] = useState(false);
  const [isYamlEditing, setIsYamlEditing] = useState(false);
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
    layoutDirection,
  );

  const gridTemplateColumns = calculateGridTemplateColumns(
    leftPaneWidth,
    rightPaneWidth,
    isLeftPaneCollapsed,
    isRightPaneCollapsed,
  );

  const domainState = {
    yamlText: yamlHistory.value,
    setYamlText: yamlHistory.setValue,
    resetYamlText: yamlHistory.reset,
    markYamlClean: yamlHistory.markClean,
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
    layoutDirection,
    setLayoutDirection,
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
      layoutDirection,
      setLayoutDirection,
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
  layoutDirection: CanvasLayoutDirection,
) {
  const visibleGraph = useMemo(() => {
    if (!displayGraph) {
      return null;
    }

    if (canvasViewMode === "errors") {
      return getErrorGraph(displayGraph);
    }

    return getFlowGraph(displayGraph);
  }, [displayGraph, canvasViewMode]);

  const positionedDisplayGraph = useMemo(() => {
    if (!displayGraph) {
      return { nodes: [], edges: [] };
    }

    return layoutVibeGraph(displayGraph, { direction: layoutDirection });
  }, [displayGraph, layoutDirection]);

  const positionedGraph = useMemo(() => {
    if (!visibleGraph) {
      return { nodes: [], edges: [] };
    }

    return layoutVibeGraph(visibleGraph, {
      mode: canvasViewMode,
      direction: layoutDirection,
    });
  }, [visibleGraph, canvasViewMode, layoutDirection]);

  return {
    visibleGraph,
    positionedGraph,
    positionedDisplayGraph,
  };
}

export type VisualVibesStore = ReturnType<typeof useVisualVibesStore>;
export type DomainState = VisualVibesStore["domainState"];
export type UiState = VisualVibesStore["uiState"];
export type EditingState = VisualVibesStore["editingState"];
export type GraphLayoutState = VisualVibesStore["graphLayout"];
export type YamlTextSetter = Dispatch<SetStateAction<string>>;
