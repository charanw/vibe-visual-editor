"use client";

import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout";
import type { VisualVibe } from "@/lib/visual-vibes/schema";

type MetadataField = "id" | "name" | "description";

export type CanvasViewMode = "flow" | "errors";

type CenterRequest = {
  stepId: string;
  requestId: number;
} | null;

type VibeCanvasProps = {
  vibe: VisualVibe | null;
  graph: PositionedVibeGraph;
  classificationGraph: PositionedVibeGraph;
  selectedStepId: string | null;
  centerRequest: CenterRequest;
  viewMode: CanvasViewMode;
  isEditing: boolean;
  onSelectStep: (stepId: string) => void;
  onClearSelectedStep: () => void;
  onChangeViewMode: (viewMode: CanvasViewMode) => void;
  onStartEditing: () => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onAddStandaloneStep: () => void;
  onAddErrorHandlerNode: (sourceStepId: string) => void;
  onAddStepOnEdge: (options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) => void;
  onDeleteStep: (stepId: string) => void;
  onAddEdge: (options: { sourceStepId: string; targetStepId: string }) => void;
  onDeleteEdge: (options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) => void;
  onAppendStepAfter: (sourceStepId: string) => void;
  onPrependStepBefore: (targetStepId: string) => void;
  onUpdateVibeMetadata: (field: MetadataField, value: string) => void;
};

const CANVAS_VIEWPORT_WIDTH = 1200;
const CANVAS_VIEWPORT_HEIGHT = 720;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.5;

const SIDE_ROUTE_OFFSET = 72;
const SIDE_ROUTE_LABEL_OFFSET = 70;
const SIDE_ROUTE_EPSILON = 1;
const HORIZONTAL_LABEL_Y_OFFSET = 18;

export function VibeCanvas({
  vibe,
  graph,
  classificationGraph,
  selectedStepId,
  centerRequest,
  viewMode,
  isEditing,
  onSelectStep,
  onClearSelectedStep,
  onChangeViewMode,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onAddStandaloneStep,
  onAddStepOnEdge,
  onDeleteStep,
  onAddEdge,
  onDeleteEdge,
  onAppendStepAfter,
  onPrependStepBefore,
  onUpdateVibeMetadata,
}: VibeCanvasProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [connectingFromStepId, setConnectingFromStepId] = useState<
    string | null
  >(null);
  const [editingMetadataField, setEditingMetadataField] =
    useState<MetadataField | null>(null);
  const [metadataDraftValue, setMetadataDraftValue] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreenCanvas, setIsFullscreenCanvas] = useState(false);
  const [panStart, setPanStart] = useState<{
    clientX: number;
    clientY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const worldWidth =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH)) + 320
      : CANVAS_VIEWPORT_WIDTH;

  const worldHeight =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT)) + 320
      : CANVAS_VIEWPORT_HEIGHT;

  const nodeById = new Map(
    classificationGraph.nodes.map((node) => [node.id, node]),
  );

  const outgoingNodeIds = new Set(
    classificationGraph.edges.map((edge) => edge.source),
  );
  const errorLaneNodeIds = getErrorLaneNodeIds(classificationGraph);
  const normalFlowNodeIds = getNormalFlowNodeIds(
    classificationGraph,
    errorLaneNodeIds,
  );
  const errorBranchSourceNodeIds =
    getErrorBranchSourceNodeIds(classificationGraph);
  const startingFlowNodeIds = getStartingFlowNodeIds(graph);

  const isSelectionMode = Boolean(selectedStepId);

  const getGraphBounds = useCallback(() => {
    if (graph.nodes.length === 0) {
      return null;
    }

    const minX = Math.min(...graph.nodes.map((node) => node.x));
    const maxX = Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH));
    const minY = Math.min(...graph.nodes.map((node) => node.y));
    const maxY = Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT));

    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    };
  }, [graph.nodes]);

  const centerGraph = useCallback(() => {
    const bounds = getGraphBounds();

    if (!bounds) {
      setPan({ x: 0, y: 0 });
      return;
    }

    setPan({
      x: CANVAS_VIEWPORT_WIDTH / 2 / zoom - bounds.centerX,
      y: CANVAS_VIEWPORT_HEIGHT / 2 / zoom - bounds.centerY,
    });
  }, [getGraphBounds, zoom]);

  const centerNode = useCallback(
    (node: PositionedVibeGraph["nodes"][number]) => {
      setPan({
        x: CANVAS_VIEWPORT_WIDTH / 2 / zoom - (node.x + NODE_WIDTH / 2),
        y: CANVAS_VIEWPORT_HEIGHT / 2 / zoom - (node.y + NODE_HEIGHT / 2),
      });
    },
    [zoom],
  );

  useEffect(() => {
    if (!centerRequest) {
      return;
    }

    const targetNode = graph.nodes.find(
      (node) => node.id === centerRequest.stepId,
    );

    if (!targetNode) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      centerNode(targetNode);
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [centerNode, centerRequest, graph.nodes]);

  function isTerminalNode(nodeId: string) {
    return !outgoingNodeIds.has(nodeId);
  }

  function isConclusionLikeNode(nodeId: string, functionName: string) {
    return (
      functionName === "concludeWorkflow" ||
      nodeId === "done" ||
      nodeId.endsWith("_done") ||
      nodeId.endsWith("_complete") ||
      nodeId.endsWith("_completed")
    );
  }

  function isTerminatingErrorNode(nodeId: string, functionName: string) {
    if (isConclusionLikeNode(nodeId, functionName)) {
      return false;
    }

    return errorLaneNodeIds.has(nodeId) && isTerminalNode(nodeId);
  }

  function isConcludingNode(nodeId: string, functionName: string) {
    if (isTerminatingErrorNode(nodeId, functionName)) {
      return false;
    }

    return isConclusionLikeNode(nodeId, functionName) || isTerminalNode(nodeId);
  }

  function isErrorHandlerOnlyNode(nodeId: string) {
    const node = nodeById.get(nodeId);

    return node?.kind === "errorHub";
  }

  function shouldLabelAsErrorHandler(nodeId: string) {
    return isErrorHandlerOnlyNode(nodeId);
  }

  function hasErrorPath(nodeId: string) {
    return viewMode === "errors" && errorBranchSourceNodeIds.has(nodeId);
  }

  function isDimmedNode(nodeId: string) {
    if (!selectedStepId) {
      return false;
    }

    return nodeId !== selectedStepId;
  }

  function getNodeLabel(options: {
    nodeId: string;
    isTerminalError: boolean;
    isConclusion: boolean;
    hasErrorPathBranch: boolean;
  }) {
    const { nodeId, isTerminalError, isConclusion, hasErrorPathBranch } =
      options;

    if (isTerminalError) {
      return "TERMINATING ERROR";
    }

    if (isConclusion) {
      return "CONCLUSION";
    }

    if (hasErrorPathBranch) {
      return "VIBE STEP · HAS ERROR PATH";
    }

    if (shouldLabelAsErrorHandler(nodeId)) {
      return "ERROR HANDLER";
    }

    return "VIBE STEP";
  }

  function getNodeColors(options: {
    isSelected: boolean;
    isTerminalError: boolean;
    isConclusion: boolean;
    isErrorHandler: boolean;
  }) {
    const { isSelected, isTerminalError, isConclusion, isErrorHandler } =
      options;

    if (isSelected) {
      return {
        fill: "var(--node-selected-bg)",
        stroke: "var(--node-selected-border)",
        labelFill: "var(--brand-primary)",
        strokeWidth: "2.5",
      };
    }

    if (isTerminalError) {
      return {
        fill: "var(--danger-soft)",
        stroke: "var(--danger)",
        labelFill: "var(--danger)",
        strokeWidth: "2.5",
      };
    }

    if (isConclusion) {
      return {
        fill: "rgba(34, 197, 94, 0.12)",
        stroke: "#22c55e",
        labelFill: "#16a34a",
        strokeWidth: "2.5",
      };
    }

    if (isErrorHandler) {
      return {
        fill: "rgba(245, 158, 11, 0.12)",
        stroke: "#f59e0b",
        labelFill: "#b45309",
        strokeWidth: "2.5",
      };
    }

    return {
      fill: "var(--node-bg)",
      stroke: "var(--node-border)",
      labelFill: "var(--brand-primary)",
      strokeWidth: "2",
    };
  }

  function getEdgeFunctionLabel(edge: PositionedVibeGraph["edges"][number]) {
    const targetNode = nodeById.get(edge.target);
    const sourceNode = nodeById.get(edge.source);

    if (targetNode?.functionName) {
      return targetNode.functionName;
    }

    if (sourceNode?.functionName) {
      return sourceNode.functionName;
    }

    return edge.type;
  }

  function startEditingMetadata(field: MetadataField, currentValue: string) {
    setEditingMetadataField(field);
    setMetadataDraftValue(currentValue);
  }

  function saveMetadataEdit() {
    if (!editingMetadataField) {
      return;
    }

    onUpdateVibeMetadata(editingMetadataField, metadataDraftValue);
    setEditingMetadataField(null);
    setMetadataDraftValue("");
  }

  function cancelMetadataEdit() {
    setEditingMetadataField(null);
    setMetadataDraftValue("");
  }

  function zoomIn() {
    setZoom((currentZoom) => clamp(currentZoom * 1.2, MIN_ZOOM, MAX_ZOOM));
  }

  function zoomOut() {
    setZoom((currentZoom) => clamp(currentZoom / 1.2, MIN_ZOOM, MAX_ZOOM));
  }

  function resetZoom() {
    setZoom(1);
  }

  function resetZoomAndPan() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function handleWheelZoom(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();

    const svgElement = event.currentTarget;
    const svgRect = svgElement.getBoundingClientRect();

    const mouseX =
      ((event.clientX - svgRect.left) / svgRect.width) * CANVAS_VIEWPORT_WIDTH;
    const mouseY =
      ((event.clientY - svgRect.top) / svgRect.height) *
      CANVAS_VIEWPORT_HEIGHT;

    const worldMouseX = mouseX / zoom - pan.x;
    const worldMouseY = mouseY / zoom - pan.y;

    const zoomFactor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nextZoom = clamp(zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);

    setZoom(nextZoom);
    setPan({
      x: mouseX / nextZoom - worldMouseX,
      y: mouseY / nextZoom - worldMouseY,
    });
  }

  function recenterCanvas() {
    if (graph.nodes.length === 0) {
      setPan({ x: 0, y: 0 });
      return;
    }

    const selectedNode = selectedStepId
      ? graph.nodes.find((node) => node.id === selectedStepId)
      : null;

    if (selectedNode) {
      centerNode(selectedNode);
      return;
    }

    centerGraph();
  }

  function startPanning(event: ReactMouseEvent<SVGRectElement>) {
    setPanStart({
      clientX: event.clientX,
      clientY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    });
  }

  function continuePanning(event: ReactMouseEvent<SVGSVGElement>) {
    if (!panStart) {
      return;
    }

    const deltaX = (event.clientX - panStart.clientX) / zoom;
    const deltaY = (event.clientY - panStart.clientY) / zoom;

    setPan({
      x: panStart.panX + deltaX,
      y: panStart.panY + deltaY,
    });
  }

  function stopPanning() {
    setPanStart(null);
  }

  function isSideRoutedVerticalEdge(edge: PositionedVibeGraph["edges"][number]) {
    return (
      Math.abs(edge.sourceX - edge.targetX) <= SIDE_ROUTE_EPSILON &&
      Math.abs(edge.sourceY - edge.targetY) > NODE_HEIGHT / 2
    );
  }

  function getSideRouteDirection(edge: PositionedVibeGraph["edges"][number]) {
    return edge.type === "error" ? -1 : 1;
  }

  function getSideRouteLaneOffset(edge: PositionedVibeGraph["edges"][number]) {
    if (!isSideRoutedVerticalEdge(edge)) {
      return 0;
    }

    const laneOffsets = [-28, 0, 28, -56, 56];
    const hash = hashString(`${edge.type}:${edge.source}:${edge.target}`);

    return laneOffsets[hash % laneOffsets.length];
  }

  function getSideRouteBendX(edge: PositionedVibeGraph["edges"][number]) {
    const direction = getSideRouteDirection(edge);
    const laneOffset = getSideRouteLaneOffset(edge);

    return edge.sourceX + direction * (SIDE_ROUTE_OFFSET + laneOffset);
  }

  function getEdgeLabelPoint(edge: PositionedVibeGraph["edges"][number]) {
    if (isSideRoutedVerticalEdge(edge)) {
      const direction = getSideRouteDirection(edge);

      return {
        x: getSideRouteBendX(edge) + direction * SIDE_ROUTE_LABEL_OFFSET,
        y: (edge.sourceY + edge.targetY) / 2,
      };
    }

    const isMostlyHorizontal =
      Math.abs(edge.sourceY - edge.targetY) <= SIDE_ROUTE_EPSILON;

    return {
      x: (edge.sourceX + edge.targetX) / 2,
      y:
        (edge.sourceY + edge.targetY) / 2 -
        (isMostlyHorizontal ? HORIZONTAL_LABEL_Y_OFFSET : 0),
    };
  }

  function getEdgePath(edge: PositionedVibeGraph["edges"][number]) {
    if (isSideRoutedVerticalEdge(edge)) {
      const bendX = getSideRouteBendX(edge);

      return `M ${edge.sourceX} ${edge.sourceY} L ${bendX} ${edge.sourceY} L ${bendX} ${edge.targetY} L ${edge.targetX} ${edge.targetY}`;
    }

    if (edge.type === "error") {
      const verticalMidY = (edge.sourceY + edge.targetY) / 2;

      return `M ${edge.sourceX} ${edge.sourceY} C ${edge.sourceX} ${verticalMidY}, ${edge.targetX} ${verticalMidY}, ${edge.targetX} ${edge.targetY}`;
    }

    const horizontalMidX = (edge.sourceX + edge.targetX) / 2;

    return `M ${edge.sourceX} ${edge.sourceY} C ${horizontalMidX} ${edge.sourceY}, ${horizontalMidX} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`;
  }

  const canvasContent = (
    <div
      className={`relative bg-[var(--canvas-bg)] ${
        isFullscreenCanvas
          ? "h-screen w-screen overflow-hidden p-6"
          : "h-full w-full overflow-hidden p-8"
      }`}
    >
      {graph.nodes.length === 0 && (
        <div className="mb-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
          No Vibe Steps found. Unlock step editing and add a standalone step to
          start a new Vibe.
        </div>
      )}

      {connectingFromStepId && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-4 py-2 text-sm text-[var(--text-primary)]">
          <span>
            Linking from <strong>{connectingFromStepId}</strong>. Click a
            left-side link handle on another node to finish.
          </span>

          <button
            type="button"
            onClick={() => setConnectingFromStepId(null)}
            className="text-xs font-semibold text-[var(--brand-primary)]"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex h-full min-h-[640px] flex-col rounded-2xl border border-[var(--border-subtle)] bg-[var(--canvas-inner-bg)] shadow-sm">
        {!isFullscreenCanvas && (
          <div className="border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-5 py-4">
            <div className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
                Visual Vibe
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Metadata can be edited directly. Step editing is{" "}
                {isEditing ? "enabled" : "locked"}.
              </div>
            </div>

            <div className="space-y-4">
              <EditableMetadataField
                label="Vibe ID"
                field="id"
                value={vibe?.workflow.id ?? ""}
                fallbackValue="No vibe loaded"
                canEditMetadata={true}
                editingMetadataField={editingMetadataField}
                metadataDraftValue={metadataDraftValue}
                onStartEditing={startEditingMetadata}
                onChangeDraft={setMetadataDraftValue}
                onSave={saveMetadataEdit}
                onCancel={cancelMetadataEdit}
              />

              <EditableMetadataField
                label="Name"
                field="name"
                value={vibe?.workflow.name ?? ""}
                fallbackValue="Untitled Visual Vibe"
                canEditMetadata={true}
                editingMetadataField={editingMetadataField}
                metadataDraftValue={metadataDraftValue}
                onStartEditing={startEditingMetadata}
                onChangeDraft={setMetadataDraftValue}
                onSave={saveMetadataEdit}
                onCancel={cancelMetadataEdit}
                isLarge
              />

              <EditableMetadataField
                label="Description"
                field="description"
                value={vibe?.workflow.description ?? ""}
                fallbackValue="No description available."
                canEditMetadata={true}
                editingMetadataField={editingMetadataField}
                metadataDraftValue={metadataDraftValue}
                onStartEditing={startEditingMetadata}
                onChangeDraft={setMetadataDraftValue}
                onSave={saveMetadataEdit}
                onCancel={cancelMetadataEdit}
                multiline
              />
            </div>
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
                Steps
              </div>
              <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                Visual Step Flow
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {isSelectionMode
                  ? "Selection mode highlights only the selected step while keeping the graph layout stable."
                  : viewMode === "flow"
                    ? "Flow View shows the main execution path."
                    : "Error View shows each error path as its own vertical chain."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {selectedStepId && (
                <button
                  type="button"
                  onClick={onClearSelectedStep}
                  className="rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-semibold text-[var(--brand-primary)]"
                >
                  Clear selection
                </button>
              )}

              <div className="flex overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)]">
                <button
                  type="button"
                  onClick={() => onChangeViewMode("flow")}
                  className={`px-3 py-2 text-xs font-semibold ${
                    viewMode === "flow"
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  }`}
                >
                  Flow View
                </button>

                <button
                  type="button"
                  onClick={() => onChangeViewMode("errors")}
                  className={`border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold ${
                    viewMode === "errors"
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  }`}
                >
                  Error View
                </button>
              </div>

              <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                {graph.nodes.length}{" "}
                {graph.nodes.length === 1 ? "step" : "steps"}
              </div>

              {isEditing && (
                <button
                  type="button"
                  onClick={onAddStandaloneStep}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-3 py-2 text-xs font-semibold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white"
                >
                  <PlusIcon />
                  Add standalone step
                </button>
              )}

              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={onCancelEditing}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                  >
                    <CancelIcon />
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={onSaveEditing}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    <SaveIcon />
                    Save
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onStartEditing}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
                >
                  <LockIcon />
                  Unlock step editing
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <LegendItem
              lineClassName="border-[var(--brand-primary)]"
              label="Main flow"
            />
            <LegendItem
              lineClassName="border-yellow-500"
              label="Error handler"
            />
            <LegendItem
              lineClassName="border-yellow-500 border-dashed"
              label="Error edge"
            />
            <LegendItem
              lineClassName="border-[var(--danger)] border-dashed"
              label="Terminating error"
            />
            <LegendItem lineClassName="border-green-500" label="Conclusion" />
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--canvas-bg)]">
            <div className="absolute right-4 top-4 z-10 flex overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] shadow-sm">
              <button
                type="button"
                onClick={zoomOut}
                className="px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                title="Zoom out"
              >
                −
              </button>

              <button
                type="button"
                onClick={resetZoom}
                className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                title="Reset zoom"
              >
                {Math.round(zoom * 100)}%
              </button>

              <button
                type="button"
                onClick={zoomIn}
                className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                title="Zoom in"
              >
                +
              </button>

              <button
                type="button"
                onClick={recenterCanvas}
                className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                title="Recenter canvas"
              >
                Center
              </button>

              <button
                type="button"
                onClick={resetZoomAndPan}
                className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                title="Reset zoom and pan"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() =>
                  setIsFullscreenCanvas((currentValue) => !currentValue)
                }
                className="border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                title={
                  isFullscreenCanvas
                    ? "Exit canvas fullscreen"
                    : "Canvas fullscreen"
                }
              >
                {isFullscreenCanvas ? "Exit" : "Full"}
              </button>
            </div>

            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${CANVAS_VIEWPORT_WIDTH} ${CANVAS_VIEWPORT_HEIGHT}`}
              className={`block h-full min-h-[620px] w-full ${
                panStart ? "cursor-grabbing" : "cursor-grab"
              }`}
              onWheel={handleWheelZoom}
              onMouseMove={continuePanning}
              onMouseUp={stopPanning}
              onMouseLeave={stopPanning}
            >
              <defs>
                <marker
                  id="arrow-data"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--edge-color)" />
                </marker>

                <marker
                  id="arrow-next"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--brand-primary)" />
                </marker>

                <marker
                  id="arrow-error"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="#f59e0b" />
                </marker>

                <marker
                  id="arrow-terminal-error"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--danger)" />
                </marker>
              </defs>

              <rect
                x="-2000"
                y="-2000"
                width={Math.max(worldWidth + 4000, 6000)}
                height={Math.max(worldHeight + 4000, 6000)}
                fill="transparent"
                onMouseDown={startPanning}
              />

              <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                {graph.edges.map((edge) => {
                  const edgeLabelPoint = getEdgeLabelPoint(edge);
                  const addButtonX = edgeLabelPoint.x;
                  const addButtonY = edgeLabelPoint.y;
                  const edgeActionY = addButtonY + 34;
                  const deleteButtonX = addButtonX + 38;
                  const deleteButtonY = edgeActionY;
                  const isHovered = hoveredEdgeId === edge.id;
                  const isDimmedBySelection = Boolean(selectedStepId);
                  const edgeOpacity = isDimmedBySelection
                    ? "0.12"
                    : edge.type === "data"
                      ? "0.45"
                      : "1";
                  const edgePath = getEdgePath(edge);
                  const targetNode = nodeById.get(edge.target);
                  const isEdgeToTerminalError = Boolean(
                    targetNode &&
                      isTerminatingErrorNode(
                        targetNode.id,
                        targetNode.functionName,
                      ),
                  );

                  const edgeLabel = getEdgeFunctionLabel(edge);
                  const labelWidth = Math.min(
                    190,
                    Math.max(76, edgeLabel.length * 6.5 + 20),
                  );

                  const stroke = isEdgeToTerminalError
                    ? "var(--danger)"
                    : edge.type === "error"
                      ? "#f59e0b"
                      : edge.type === "next"
                        ? "var(--brand-primary)"
                        : "var(--edge-color)";

                  const markerEnd = isEdgeToTerminalError
                    ? "url(#arrow-terminal-error)"
                    : edge.type === "error"
                      ? "url(#arrow-error)"
                      : edge.type === "next"
                        ? "url(#arrow-next)"
                        : "url(#arrow-data)";

                  const strokeDasharray = isEdgeToTerminalError
                    ? "7 5"
                    : edge.type === "error"
                      ? "7 5"
                      : edge.type === "data"
                        ? "3 5"
                        : undefined;

                  return (
                    <g
                      key={edge.id}
                      onMouseEnter={() => setHoveredEdgeId(edge.id)}
                      onMouseLeave={() => setHoveredEdgeId(null)}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <path
                        d={edgePath}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="44"
                        pointerEvents="stroke"
                      />

                      {isEditing && isHovered && (
                        <rect
                          x={addButtonX - 76}
                          y={addButtonY - 22}
                          width="160"
                          height="86"
                          rx="18"
                          fill="transparent"
                          pointerEvents="all"
                          onMouseEnter={() => setHoveredEdgeId(edge.id)}
                        />
                      )}

                      <path
                        d={edgePath}
                        fill="none"
                        stroke={stroke}
                        strokeWidth={
                          edge.type === "error" || isEdgeToTerminalError
                            ? "2.5"
                            : "2"
                        }
                        strokeDasharray={strokeDasharray}
                        markerEnd={markerEnd}
                        opacity={edgeOpacity}
                        pointerEvents="none"
                      />

                      <g pointerEvents="none" opacity={edgeOpacity}>
                        <rect
                          x={addButtonX - labelWidth / 2}
                          y={addButtonY - 11}
                          width={labelWidth}
                          height="22"
                          rx="11"
                          fill="var(--panel-bg)"
                          stroke={stroke}
                          strokeWidth="1"
                          opacity="0.92"
                        />

                        <text
                          x={addButtonX}
                          y={addButtonY + 4}
                          textAnchor="middle"
                          fill={
                            isEdgeToTerminalError
                              ? "var(--danger)"
                              : edge.type === "error"
                                ? "#b45309"
                                : edge.type === "next"
                                  ? "var(--brand-primary)"
                                  : "var(--edge-color)"
                          }
                          fontSize="10"
                          fontWeight="700"
                        >
                          {edgeLabel}
                        </text>
                      </g>

                      {isHovered && isEdgeToTerminalError && (
                        <text
                          x={addButtonX}
                          y={addButtonY - 20}
                          textAnchor="middle"
                          fill="var(--danger)"
                          fontSize="10"
                          fontWeight="700"
                          pointerEvents="none"
                        >
                          TERMINATING ERROR
                        </text>
                      )}

                      {isHovered &&
                        edge.type === "error" &&
                        !isEdgeToTerminalError && (
                          <text
                            x={addButtonX}
                            y={addButtonY - 20}
                            textAnchor="middle"
                            fill="#f59e0b"
                            fontSize="10"
                            fontWeight="700"
                            pointerEvents="none"
                          >
                            ERROR PATH
                          </text>
                        )}

                      {isHovered && edge.type === "data" && (
                        <text
                          x={addButtonX}
                          y={addButtonY - 20}
                          textAnchor="middle"
                          fill="var(--edge-color)"
                          fontSize="10"
                          fontWeight="700"
                          opacity="0.6"
                          pointerEvents="none"
                        >
                          DATA
                        </text>
                      )}

                      {isEditing && isHovered && (
                        <>
                          <g
                            transform={`translate(${addButtonX}, ${edgeActionY})`}
                            onMouseEnter={() => setHoveredEdgeId(edge.id)}
                            onClick={(event) => {
                              event.stopPropagation();

                              onAddStepOnEdge({
                                sourceStepId: edge.source,
                                targetStepId: edge.target,
                                edgeType: edge.type,
                              });
                            }}
                            className="cursor-pointer"
                          >
                            <circle
                              r="16"
                              fill="var(--panel-bg)"
                              stroke={stroke}
                              strokeWidth="2"
                            />
                            <text
                              x="0"
                              y="5"
                              textAnchor="middle"
                              fill={stroke}
                              fontSize="18"
                              fontWeight="700"
                              pointerEvents="none"
                            >
                              +
                            </text>
                          </g>

                          <g
                            transform={`translate(${deleteButtonX}, ${deleteButtonY})`}
                            onMouseEnter={() => setHoveredEdgeId(edge.id)}
                            onClick={(event) => {
                              event.stopPropagation();

                              onDeleteEdge({
                                sourceStepId: edge.source,
                                targetStepId: edge.target,
                                edgeType: edge.type,
                              });
                            }}
                            className="cursor-pointer"
                          >
                            <circle
                              r="16"
                              fill="var(--danger-soft)"
                              stroke="var(--danger)"
                              strokeWidth="2"
                            />
                            <text
                              x="0"
                              y="5"
                              textAnchor="middle"
                              fill="var(--danger)"
                              fontSize="16"
                              fontWeight="700"
                              pointerEvents="none"
                            >
                              ×
                            </text>
                          </g>
                        </>
                      )}
                    </g>
                  );
                })}

                {graph.nodes.map((node) => {
                  const isSelected = selectedStepId === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isTerminalError = isTerminatingErrorNode(
                    node.id,
                    node.functionName,
                  );
                  const isConclusion = isConcludingNode(
                    node.id,
                    node.functionName,
                  );
                  const isStartingFlowNode =
                    viewMode === "flow" &&
                    startingFlowNodeIds.has(node.id) &&
                    !isConclusion &&
                    !isTerminalError;
                  const hasErrorPathBranch = hasErrorPath(node.id);
                  const isDimmed = isDimmedNode(node.id);
                  const isErrorHandler =
                    shouldLabelAsErrorHandler(node.id) && !isTerminalError;

                  const nodeLabel = getNodeLabel({
                    nodeId: node.id,
                    isTerminalError,
                    isConclusion,
                    hasErrorPathBranch,
                  });

                  const nodeColors = getNodeColors({
                    isSelected,
                    isTerminalError,
                    isConclusion,
                    isErrorHandler,
                  });

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={() => onSelectStep(node.id)}
                      className="cursor-pointer"
                      opacity={isDimmed ? "0.14" : "1"}
                    >
                      <rect
                        x="-34"
                        y="-14"
                        width={NODE_WIDTH + 68}
                        height={NODE_HEIGHT + 82}
                        rx="24"
                        fill="transparent"
                      />

                      <rect
                        width={NODE_WIDTH}
                        height={NODE_HEIGHT}
                        rx="16"
                        fill={nodeColors.fill}
                        stroke={nodeColors.stroke}
                        strokeWidth={nodeColors.strokeWidth}
                      />

                      {isConclusion && (
                        <ConclusionBadge x={NODE_WIDTH - 30} y={26} />
                      )}

                      {isStartingFlowNode && (
                        <StartingFlagBadge x={NODE_WIDTH - 30} y={26} />
                      )}

                      {isEditing && isHovered && (
                        <>
                          <g
                            transform={`translate(${NODE_WIDTH - 18}, 18)`}
                            onClick={(event) => {
                              event.stopPropagation();
                              onDeleteStep(node.id);
                            }}
                            className="cursor-pointer"
                          >
                            <circle
                              r="12"
                              fill="var(--danger-soft)"
                              stroke="var(--danger)"
                              strokeWidth="2"
                            />
                            <text
                              x="0"
                              y="4"
                              textAnchor="middle"
                              fill="var(--danger)"
                              fontSize="15"
                              fontWeight="700"
                              pointerEvents="none"
                            >
                              ×
                            </text>
                          </g>

                          <NodeActionButton
                            x={6}
                            y={NODE_HEIGHT + 18}
                            label="+ Before"
                            onClick={(event) => {
                              event.stopPropagation();
                              onPrependStepBefore(node.id);
                            }}
                          />

                          <NodeActionButton
                            x={112}
                            y={NODE_HEIGHT + 18}
                            label="+ After"
                            onClick={(event) => {
                              event.stopPropagation();
                              onAppendStepAfter(node.id);
                            }}
                          />
                        </>
                      )}

                      {isEditing && isHovered && (
                        <>
                          <g
                            transform={`translate(${NODE_WIDTH + 10}, ${NODE_HEIGHT / 2})`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setConnectingFromStepId(node.id);
                            }}
                            className="cursor-crosshair"
                          >
                            <circle
                              r="10"
                              fill="var(--panel-bg)"
                              stroke="var(--brand-primary)"
                              strokeWidth="2"
                            />
                            <path
                              d="M-4 0h8M2 -4l4 4-4 4"
                              fill="none"
                              stroke="var(--brand-primary)"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              pointerEvents="none"
                            />
                          </g>

                          <g
                            transform={`translate(${-10}, ${NODE_HEIGHT / 2})`}
                            onClick={(event) => {
                              event.stopPropagation();

                              if (
                                !connectingFromStepId ||
                                connectingFromStepId === node.id
                              ) {
                                return;
                              }

                              onAddEdge({
                                sourceStepId: connectingFromStepId,
                                targetStepId: node.id,
                              });

                              setConnectingFromStepId(null);
                            }}
                            className={
                              connectingFromStepId &&
                              connectingFromStepId !== node.id
                                ? "cursor-crosshair"
                                : "cursor-not-allowed"
                            }
                          >
                            <circle
                              r="10"
                              fill={
                                connectingFromStepId &&
                                connectingFromStepId !== node.id
                                  ? "var(--brand-soft)"
                                  : "var(--panel-bg)"
                              }
                              stroke={
                                connectingFromStepId &&
                                connectingFromStepId !== node.id
                                  ? "var(--brand-primary)"
                                  : "var(--border-subtle)"
                              }
                              strokeWidth="2"
                            />
                            <path
                              d="M-4 0h8M-2 -4l-4 4 4 4"
                              fill="none"
                              stroke={
                                connectingFromStepId &&
                                connectingFromStepId !== node.id
                                  ? "var(--brand-primary)"
                                  : "var(--text-muted)"
                              }
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              pointerEvents="none"
                            />
                          </g>
                        </>
                      )}

                      <text
                        x="18"
                        y="34"
                        fill={nodeColors.labelFill}
                        fontSize="11"
                        fontWeight="700"
                        letterSpacing="1.4"
                        pointerEvents="none"
                      >
                        {nodeLabel}
                      </text>

                      <text
                        x="18"
                        y="60"
                        fill="var(--text-primary)"
                        fontSize="14"
                        fontWeight="700"
                        pointerEvents="none"
                      >
                        {node.id}
                      </text>

                      <text
                        x="18"
                        y="84"
                        fill="var(--text-muted)"
                        fontSize="12"
                        pointerEvents="none"
                      >
                        {node.functionName}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreenCanvas && typeof document !== "undefined") {
    return createPortal(
      <div className="fixed inset-0 z-[9999] h-screen w-screen overflow-hidden bg-[var(--canvas-bg)]">
        {canvasContent}
      </div>,
      document.body,
    );
  }

  return canvasContent;
}

function getErrorLaneNodeIds(graph: PositionedVibeGraph) {
  const errorLaneNodeIds = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.type === "error") {
      errorLaneNodeIds.add(edge.target);
    }
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const edge of graph.edges) {
      if (edge.type !== "next") {
        continue;
      }

      if (
        errorLaneNodeIds.has(edge.source) &&
        !errorLaneNodeIds.has(edge.target)
      ) {
        errorLaneNodeIds.add(edge.target);
        changed = true;
      }
    }
  }

  return errorLaneNodeIds;
}

function getNormalFlowNodeIds(
  graph: PositionedVibeGraph,
  errorLaneNodeIds: Set<string>,
) {
  const normalFlowNodeIds = new Set<string>();

  for (const node of graph.nodes) {
    if (!errorLaneNodeIds.has(node.id)) {
      normalFlowNodeIds.add(node.id);
    }
  }

  let changed = true;

  while (changed) {
    changed = false;

    for (const edge of graph.edges) {
      if (edge.type !== "next") {
        continue;
      }

      if (
        normalFlowNodeIds.has(edge.source) &&
        !normalFlowNodeIds.has(edge.target)
      ) {
        normalFlowNodeIds.add(edge.target);
        changed = true;
      }
    }
  }

  return normalFlowNodeIds;
}

function getErrorBranchSourceNodeIds(graph: PositionedVibeGraph) {
  const errorBranchSourceNodeIds = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.type === "error") {
      errorBranchSourceNodeIds.add(edge.source);
    }
  }

  return errorBranchSourceNodeIds;
}

function getStartingFlowNodeIds(graph: PositionedVibeGraph) {
  const incomingNextTargetIds = new Set(
    graph.edges
      .filter((edge) => edge.type === "next")
      .map((edge) => edge.target),
  );

  return new Set(
    graph.nodes
      .filter((node) => !incomingNextTargetIds.has(node.id))
      .map((node) => node.id),
  );
}

function ConclusionBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle r="15" fill="#22c55e" opacity="0.95" />
      <path
        d="M-6 0 -1 5 7 -6"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
    </g>
  );
}

function StartingFlagBadge({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <circle
        r="15"
        fill="var(--panel-bg)"
        stroke="var(--brand-primary)"
        strokeWidth="2"
        opacity="0.96"
      />

      <path
        d="M-6 8V-8"
        stroke="var(--brand-primary)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M-5 -8 C-1 -10 3 -6 8 -8 V0 C3 2 -1 -2 -5 0 Z"
        fill="var(--panel-muted-bg)"
        stroke="var(--brand-primary)"
        strokeWidth="1"
      />

      <rect
        x="-4.5"
        y="-7.2"
        width="4"
        height="4"
        fill="var(--brand-primary)"
      />
      <rect
        x="3.5"
        y="-6.6"
        width="4"
        height="4"
        fill="var(--brand-primary)"
      />
      <rect
        x="-0.5"
        y="-2.8"
        width="4"
        height="4"
        fill="var(--brand-primary)"
      />
    </g>
  );
}

type NodeActionButtonProps = {
  x: number;
  y: number;
  label: string;
  onClick: (event: ReactMouseEvent<SVGGElement>) => void;
};

function NodeActionButton({ x, y, label, onClick }: NodeActionButtonProps) {
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={onClick}
      className="cursor-pointer"
    >
      <rect
        x="-4"
        y="-4"
        width="104"
        height="38"
        rx="17"
        fill="transparent"
      />

      <rect
        width="96"
        height="30"
        rx="15"
        fill="var(--panel-bg)"
        stroke="var(--brand-primary)"
        strokeWidth="1.5"
      />

      <text
        x="48"
        y="19"
        textAnchor="middle"
        fill="var(--brand-primary)"
        fontSize="10"
        fontWeight="700"
        pointerEvents="none"
      >
        {label}
      </text>
    </g>
  );
}

type LegendItemProps = {
  lineClassName: string;
  label: string;
};

function LegendItem({ lineClassName, label }: LegendItemProps) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-8 border-t-2 ${lineClassName}`} />
      <span>{label}</span>
    </div>
  );
}

type EditableMetadataFieldProps = {
  label: string;
  field: MetadataField;
  value: string;
  fallbackValue: string;
  canEditMetadata: boolean;
  editingMetadataField: MetadataField | null;
  metadataDraftValue: string;
  onStartEditing: (field: MetadataField, currentValue: string) => void;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  multiline?: boolean;
  isLarge?: boolean;
};

function EditableMetadataField({
  label,
  field,
  value,
  fallbackValue,
  canEditMetadata,
  editingMetadataField,
  metadataDraftValue,
  onStartEditing,
  onChangeDraft,
  onSave,
  onCancel,
  multiline = false,
  isLarge = false,
}: EditableMetadataFieldProps) {
  const isEditingThisField = editingMetadataField === field;
  const displayValue = value || fallbackValue;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {label}
        </div>

        {canEditMetadata && !isEditingThisField && (
          <button
            type="button"
            onClick={() => onStartEditing(field, value)}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            aria-label={`Edit ${label}`}
            title={`Edit ${label}`}
          >
            <PencilIcon />
          </button>
        )}
      </div>

      {isEditingThisField ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              value={metadataDraftValue}
              onChange={(event) => onChangeDraft(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-[var(--brand-primary)] bg-[var(--panel-muted-bg)] px-3 py-2 text-sm leading-6 text-[var(--text-primary)] outline-none"
            />
          ) : (
            <input
              value={metadataDraftValue}
              onChange={(event) => onChangeDraft(event.target.value)}
              className={`w-full rounded-lg border border-[var(--brand-primary)] bg-[var(--panel-muted-bg)] px-3 py-2 text-[var(--text-primary)] outline-none ${
                isLarge ? "text-lg font-semibold" : "text-sm font-semibold"
              }`}
            />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
            >
              <CancelIcon />
              Cancel
            </button>

            <button
              type="button"
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              <SaveIcon />
              Save
            </button>
          </div>
        </div>
      ) : multiline ? (
        <p className="mt-1 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
          {displayValue}
        </p>
      ) : (
        <div
          className={`mt-1 break-words text-[var(--text-primary)] ${
            isLarge ? "text-lg font-semibold" : "text-sm font-semibold"
          }`}
        >
          {displayValue}
        </div>
      )}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6 18 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12.5 10 17l9-10"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 7l10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}