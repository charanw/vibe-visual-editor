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
import {
  CANVAS_VIEWPORT_HEIGHT,
  CANVAS_VIEWPORT_WIDTH,
  HORIZONTAL_LABEL_Y_OFFSET,
  MAX_ZOOM,
  MIN_ZOOM,
  SIDE_ROUTE_EPSILON,
  SIDE_ROUTE_LABEL_OFFSET,
  SIDE_ROUTE_OFFSET,
} from "./canvas/canvasConstants";
import {
  clamp,
  getErrorBranchSourceNodeIds,
  getErrorLaneNodeIds,
  getStartingFlowNodeIds,
  hashString,
} from "./canvas/canvasGraphUtils";
import {
  ConclusionBadge,
  NodeActionButton,
  StartingFlagBadge,
} from "./canvas/CanvasBadges";
import { CanvasControls } from "./canvas/CanvasControls";
import { CanvasMetadataPanel } from "./canvas/CanvasMetadataPanel";
import { CanvasZoomToolbar } from "./canvas/CanvasZoomToolbar";

type MetadataField = "id" | "name" | "description";

/**
 * Selects which subset of the workflow graph the canvas should emphasize.
 * `flow` shows the primary execution path, while `errors` isolates error paths.
 */
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

/**
 * Interactive SVG canvas for viewing and editing a Visual Vibe workflow graph.
 *
 * Owns canvas-local interaction state such as zoom, pan, hover, metadata drafts,
 * edge linking, and fullscreen rendering while delegating YAML mutations upward.
 */
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

  // Canvas-local interaction state. YAML mutations are still owned by the
  // parent editor so the source text remains the single source of truth.
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

  // Classification uses the full graph even when the canvas is drawing a
  // filtered graph. That keeps labels such as conclusion/error consistent
  // across Flow View and Error View.
  const nodeById = new Map(
    classificationGraph.nodes.map((node) => [node.id, node]),
  );

  const outgoingNodeIds = new Set(
    classificationGraph.edges.map((edge) => edge.source),
  );
  const errorLaneNodeIds = getErrorLaneNodeIds(classificationGraph);
  const errorBranchSourceNodeIds =
    getErrorBranchSourceNodeIds(classificationGraph);
  const startingFlowNodeIds = getStartingFlowNodeIds(graph);

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

    // Zoom around the pointer rather than the canvas origin. This makes large
    // graphs feel anchored while the user inspects a specific node or edge.
    const svgElement = event.currentTarget;
    const svgRect = svgElement.getBoundingClientRect();

    const mouseX =
      ((event.clientX - svgRect.left) / svgRect.width) * CANVAS_VIEWPORT_WIDTH;
    const mouseY =
      ((event.clientY - svgRect.top) / svgRect.height) * CANVAS_VIEWPORT_HEIGHT;

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

  function isSideRoutedVerticalEdge(
    edge: PositionedVibeGraph["edges"][number],
  ) {
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

    // Deterministic offsets keep repeated renders stable while separating
    // parallel vertical edges enough that labels/actions remain clickable.
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
          ? "h-screen w-screen overflow-hidden p-2 sm:p-4 lg:p-6"
          : "h-full w-full overflow-hidden p-0 lg:p-8"
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

      <div className="flex h-full min-h-[640px] flex-col rounded-none border-0 border-[var(--border-subtle)] bg-[var(--canvas-inner-bg)] shadow-none lg:rounded-2xl lg:border lg:shadow-sm">
        {!isFullscreenCanvas && (
          <CanvasMetadataPanel
            vibe={vibe}
            isEditing={isEditing}
            editingMetadataField={editingMetadataField}
            metadataDraftValue={metadataDraftValue}
            onStartEditing={startEditingMetadata}
            onChangeDraft={setMetadataDraftValue}
            onSave={saveMetadataEdit}
            onCancel={cancelMetadataEdit}
          />
        )}
        <div className="flex min-h-0 flex-1 flex-col p-3 lg:p-6">
          <CanvasControls
            selectedStepId={selectedStepId}
            viewMode={viewMode}
            nodeCount={graph.nodes.length}
            isEditing={isEditing}
            onClearSelectedStep={onClearSelectedStep}
            onChangeViewMode={onChangeViewMode}
            onAddStandaloneStep={onAddStandaloneStep}
            onStartEditing={onStartEditing}
            onSaveEditing={onSaveEditing}
            onCancelEditing={onCancelEditing}
          />
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--canvas-bg)]">
            <CanvasZoomToolbar
              zoom={zoom}
              isFullscreenCanvas={isFullscreenCanvas}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onResetZoom={resetZoom}
              onRecenterCanvas={recenterCanvas}
              onResetZoomAndPan={resetZoomAndPan}
              onToggleFullscreen={() =>
                setIsFullscreenCanvas((currentValue) => !currentValue)
              }
            />
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
