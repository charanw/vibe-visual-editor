"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
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
  onAppendStepAfter: (
    sourceStepId: string,
    anchor?: FloatingPanelAnchor,
  ) => void;
  onPrependStepBefore: (
    targetStepId: string,
    anchor?: FloatingPanelAnchor,
  ) => void;
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
  onAppendStepAfter,
  onPrependStepBefore,
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
              onAddStandaloneStep={onAddStandaloneStep}
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
              selectedStepId={selectedStepId}
              hoveredEdgeId={hoveredEdgeId}
              hoveredNodeId={hoveredNodeId}
              connectingFromStepId={connectingFromStepId}
              onHoverEdge={setHoveredEdgeId}
              onHoverNode={setHoveredNodeId}
              onStartPanning={viewport.startPanning}
              onContinuePanning={viewport.continuePanning}
              onStopPanning={viewport.stopPanning}
              onWheelZoom={viewport.handleWheelZoom}
              onSelectStep={onSelectStep}
              onDeleteStep={onDeleteStep}
              onAddStepOnEdge={onAddStepOnEdge}
              onDeleteEdge={onDeleteEdge}
              onAddEdge={onAddEdge}
              onUpdateCondition={onUpdateCondition}
              onStartConnecting={setConnectingFromStepId}
              onClearConnectingStep={() => setConnectingFromStepId(null)}
              onAppendStepAfter={onAppendStepAfter}
              onPrependStepBefore={onPrependStepBefore}
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
