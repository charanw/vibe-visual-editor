"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout/layoutTypes";
import type {
  AddEdgeOptions,
  CanvasViewMode,
  CenterRequest,
  EdgeOperationOptions,
  FloatingPanelAnchor,
} from "../types";
import { CanvasControls } from "./canvas/components/CanvasControls";
import { AddStepWizard } from "./canvas/components/AddStepWizard";
import { CanvasGraph } from "./canvas/components/CanvasGraph";
import { CanvasZoomToolbar } from "./canvas/components/CanvasZoomToolbar";
import { useCanvasNodeClassifier } from "./canvas/hooks/useCanvasNodeClassifier";
import { useCanvasViewport } from "./canvas/hooks/useCanvasViewport";
import type { CanvasViewportState } from "../state/visualVibesStore";
import type { HistoryDisplayItem } from "../state/editorHistory";
import type {
  AddStepPlacement,
  AddStepWizardSelection,
} from "../types";

type VibeCanvasProps = {
  graph: PositionedVibeGraph;
  classificationGraph: PositionedVibeGraph;
  selectedStepId: string | null;
  centerRequest: CenterRequest;
  viewMode: CanvasViewMode;
  isEditing: boolean;
  canUndoYaml: boolean;
  canRedoYaml: boolean;
  historyItems: HistoryDisplayItem[];
  onSelectStep: (stepId: string, anchor?: FloatingPanelAnchor) => void;
  onClearSelectedStep: () => void;
  onUndoYaml: () => void;
  onRedoYaml: () => void;
  onChangeViewMode: (viewMode: CanvasViewMode) => void;
  onAddStandaloneStep: (anchor?: FloatingPanelAnchor) => void;
  onAddStepOnEdge: (
    options: EdgeOperationOptions,
    anchor?: FloatingPanelAnchor,
  ) => void;
  onDeleteStep: (stepId: string) => void;
  onAddEdge: (options: AddEdgeOptions) => void;
  onDeleteEdge: (options: EdgeOperationOptions) => void;
  onUpdateCondition: (stepId: string, expression: string) => void;
  addStepRequest: AddStepPlacement | null;
  addStepAnchor: FloatingPanelAnchor | null;
  onCancelAddStepRequest: () => void;
  onConfirmAddStepRequest: (selection: AddStepWizardSelection) => void;
  canvasViewport: CanvasViewportState;
  onCanvasViewportChange: Dispatch<SetStateAction<CanvasViewportState>>;
};

/**
 * Interactive canvas shell for viewing and editing a Visual Vibe workflow graph.
 *
 * Canvas-specific state and rendering live in focused `components/canvas`
 * modules so this component can stay close to orchestration.
 */
export function VibeCanvas({
  graph,
  classificationGraph,
  selectedStepId,
  centerRequest,
  viewMode,
  isEditing,
  canUndoYaml,
  canRedoYaml,
  historyItems,
  onSelectStep,
  onClearSelectedStep,
  onUndoYaml,
  onRedoYaml,
  onChangeViewMode,
  onAddStandaloneStep,
  onAddStepOnEdge,
  onDeleteStep,
  onAddEdge,
  onDeleteEdge,
  onUpdateCondition,
  addStepRequest,
  addStepAnchor,
  onCancelAddStepRequest,
  onConfirmAddStepRequest,
  canvasViewport,
  onCanvasViewportChange,
}: VibeCanvasProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [connectingFromStepId, setConnectingFromStepId] = useState<
    string | null
  >(null);
  const [blankCanvasPointer, setBlankCanvasPointer] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [connectionPreviewPoint, setConnectionPreviewPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isFullscreenCanvas, setIsFullscreenCanvas] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({
    width: 1200,
    height: 720,
  });

  const nodeClassifier = useCanvasNodeClassifier({
    graph,
    classificationGraph,
    selectedStepId,
    viewMode,
  });
  const viewport = useCanvasViewport({
    graph,
    centerRequest,
    selectedStepId,
    viewportSize,
    viewport: canvasViewport,
    onViewportChange: onCanvasViewportChange,
  });
  const viewportRef = useRef(viewport);
  const graphLayoutKey = useMemo(
    () =>
      graph.nodes
        .map((node) => `${node.id}:${Math.round(node.x)}:${Math.round(node.y)}`)
        .join("|"),
    [graph.nodes],
  );

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const container = graphContainerRef.current;

    if (!container) {
      return;
    }

    const updateViewportSize = () => {
      const rect = container.getBoundingClientRect();

      setViewportSize({
        width: Math.max(360, Math.round(rect.width)),
        height: Math.max(320, Math.round(rect.height)),
      });
    };

    updateViewportSize();

    const resizeObserver = new ResizeObserver(updateViewportSize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const animationFrameId = window.requestAnimationFrame(() => {
      viewportRef.current.fitGraph();
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [graphLayoutKey, viewportSize.height, viewportSize.width]);

  function handleBlankCanvasPointerMove(
    event: ReactPointerEvent<SVGRectElement>,
  ) {
    if (!isEditing || connectingFromStepId || addStepRequest) {
      setBlankCanvasPointer(null);
      return;
    }

    const bounds = graphContainerRef.current?.getBoundingClientRect();

    if (!bounds) {
      return;
    }

    setBlankCanvasPointer({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  }

  function handleBlankCanvasAddStep(event: ReactMouseEvent<SVGRectElement>) {
    event.stopPropagation();
    if (addStepRequest) {
      return;
    }

    setBlankCanvasPointer(null);
    onAddStandaloneStep({
      x: event.clientX,
      y: event.clientY,
    });
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!connectingFromStepId) {
      if (connectionPreviewPoint) {
        setConnectionPreviewPoint(null);
      }

      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const screenX =
      ((event.clientX - bounds.left) / bounds.width) * viewportSize.width;
    const screenY =
      ((event.clientY - bounds.top) / bounds.height) * viewportSize.height;

    setConnectionPreviewPoint({
      x: screenX / viewport.zoom - viewport.pan.x,
      y: screenY / viewport.zoom - viewport.pan.y,
    });
  }

  const canvasContent = (
    <div
      className={`relative bg-[var(--canvas-bg)] ${
        isFullscreenCanvas
          ? "h-screen w-screen overflow-hidden"
          : "h-full w-full overflow-hidden"
      }`}
    >
      {graph.nodes.length === 0 && <EmptyCanvasNotice />}

      {connectingFromStepId && (
        <ConnectingNotice
          sourceStepId={connectingFromStepId}
          onCancel={() => setConnectingFromStepId(null)}
        />
      )}

      <div className="flex h-full min-h-0 flex-col bg-[var(--canvas-inner-bg)]">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-[var(--border-subtle)] px-3 py-2">
          <CanvasControls
            selectedStepId={selectedStepId}
            viewMode={viewMode}
            nodeCount={graph.nodes.length}
            canUndoYaml={canUndoYaml}
            canRedoYaml={canRedoYaml}
            historyItems={historyItems}
            onClearSelectedStep={onClearSelectedStep}
            onUndoYaml={onUndoYaml}
            onRedoYaml={onRedoYaml}
            onChangeViewMode={onChangeViewMode}
          />
          </div>

          <div
            ref={graphContainerRef}
            className="relative min-h-0 flex-1 overflow-hidden bg-[var(--canvas-bg)]"
          >
            <CanvasZoomToolbar
              zoom={viewport.zoom}
              isFullscreenCanvas={isFullscreenCanvas}
              onZoomIn={viewport.zoomIn}
              onZoomOut={viewport.zoomOut}
              onResetZoom={viewport.resetZoom}
              onRecenterCanvas={viewport.recenterCanvas}
              onResetZoomAndPan={viewport.resetZoomAndPan}
              onToggleFullscreen={() =>
                setIsFullscreenCanvas((currentValue) => !currentValue)
              }
            />

            {isEditing &&
              blankCanvasPointer &&
              !connectingFromStepId &&
              !addStepRequest && (
              <BlankCanvasAddTooltip
                x={blankCanvasPointer.x}
                y={blankCanvasPointer.y}
              />
            )}

            <CanvasGraph
              graph={graph}
              classifier={nodeClassifier}
              zoom={viewport.zoom}
              pan={viewport.pan}
              viewportWidth={viewportSize.width}
              viewportHeight={viewportSize.height}
              worldWidth={viewport.worldWidth}
              worldHeight={viewport.worldHeight}
              isPanning={viewport.isPanning}
              isEditing={isEditing}
              canAddOnBlankCanvas={isEditing && !addStepRequest}
              connectionPreviewPoint={connectionPreviewPoint}
              hoveredEdgeId={hoveredEdgeId}
              hoveredNodeId={hoveredNodeId}
              connectingFromStepId={connectingFromStepId}
              onHoverEdge={setHoveredEdgeId}
              onHoverNode={setHoveredNodeId}
              onStartPanning={viewport.startPanning}
              onBlankCanvasPointerMove={handleBlankCanvasPointerMove}
              onBlankCanvasPointerLeave={() => setBlankCanvasPointer(null)}
              onBlankCanvasAddStep={handleBlankCanvasAddStep}
              onCanvasPointerMove={handleCanvasPointerMove}
              onContinuePanning={viewport.continuePanning}
              onStopPanning={viewport.stopPanning}
              onWheelZoom={viewport.handleWheelZoom}
              onSelectStep={onSelectStep}
              onDeleteStep={onDeleteStep}
              onAddStepOnEdge={onAddStepOnEdge}
              onDeleteEdge={onDeleteEdge}
              onAddEdge={onAddEdge}
              onUpdateCondition={onUpdateCondition}
              onStartConnecting={(stepId) => {
                setConnectingFromStepId(stepId);
                setConnectionPreviewPoint(null);
              }}
              onClearConnectingStep={() => {
                setConnectingFromStepId(null);
                setConnectionPreviewPoint(null);
              }}
            />
          </div>
        </div>

        <AddStepWizard
          key={addStepRequest ? getAddStepRequestKey(addStepRequest) : "closed"}
          placement={addStepRequest}
          anchor={addStepAnchor}
          onCancel={onCancelAddStepRequest}
          onConfirm={onConfirmAddStepRequest}
        />
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

function EmptyCanvasNotice() {
  return (
    <div className="mb-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
      No Vibe Steps found. Add a standalone step to start a new Vibe.
    </div>
  );
}

function BlankCanvasAddTooltip({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="pointer-events-none absolute z-20 flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)]/95 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] shadow-[0_10px_30px_rgba(2,6,23,0.35)]"
      style={{
        left: x + 14,
        top: y + 14,
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-soft)] text-sm leading-none text-[var(--brand-primary)]">
        +
      </span>
      Double-click to add step
    </div>
  );
}

function getAddStepRequestKey(request: AddStepPlacement) {
  if (request.kind === "standalone") {
    return request.kind;
  }

  if (request.kind === "appendAfter") {
    return `${request.kind}:${request.sourceStepId}`;
  }

  if (request.kind === "prependBefore") {
    return `${request.kind}:${request.targetStepId}`;
  }

  return `${request.kind}:${request.sourceStepId}:${request.targetStepId}:${request.edgeType}`;
}

function ConnectingNotice({
  sourceStepId,
  onCancel,
}: {
  sourceStepId: string;
  onCancel: () => void;
}) {
  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-4 py-2 text-sm text-[var(--text-primary)]">
      <span>
        Linking from <strong>{sourceStepId}</strong>. Click a left-side link
        handle on another node to finish.
      </span>

      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-semibold text-[var(--brand-primary)]"
      >
        Cancel
      </button>
    </div>
  );
}
