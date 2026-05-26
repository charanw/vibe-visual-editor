"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { PositionedVibeGraph } from "@/lib/visual-vibes/layout";
import type { VisualVibe } from "@/lib/visual-vibes/schema";
import type {
  AddEdgeOptions,
  CanvasViewMode,
  CenterRequest,
  EdgeOperationOptions,
  MetadataField,
} from "../types";
import { CanvasControls } from "./canvas/components/CanvasControls";
import { CanvasGraph } from "./canvas/components/CanvasGraph";
import { CanvasMetadataPanel } from "./canvas/components/CanvasMetadataPanel";
import { CanvasZoomToolbar } from "./canvas/components/CanvasZoomToolbar";
import { useCanvasMetadataEditor } from "./canvas/hooks/useCanvasMetadataEditor";
import { useCanvasNodeClassifier } from "./canvas/hooks/useCanvasNodeClassifier";
import { useCanvasViewport } from "./canvas/hooks/useCanvasViewport";

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
  onAddStepOnEdge: (options: EdgeOperationOptions) => void;
  onDeleteStep: (stepId: string) => void;
  onAddEdge: (options: AddEdgeOptions) => void;
  onDeleteEdge: (options: EdgeOperationOptions) => void;
  onAppendStepAfter: (sourceStepId: string) => void;
  onPrependStepBefore: (targetStepId: string) => void;
  onUpdateVibeMetadata: (field: MetadataField, value: string) => void;
};

/**
 * Interactive canvas shell for viewing and editing a Visual Vibe workflow graph.
 *
 * Canvas-specific state and rendering live in focused `components/canvas`
 * modules so this component can stay close to orchestration.
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
  const [connectingFromStepId, setConnectingFromStepId] = useState<
    string | null
  >(null);
  const [isFullscreenCanvas, setIsFullscreenCanvas] = useState(false);

  const metadataEditor = useCanvasMetadataEditor({
    onUpdateVibeMetadata,
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
  });

  const canvasContent = (
    <div
      className={`relative bg-[var(--canvas-bg)] ${
        isFullscreenCanvas
          ? "h-screen w-screen overflow-hidden p-2 sm:p-4 lg:p-6"
          : "h-full w-full overflow-hidden p-0 lg:p-8"
      }`}
    >
      {graph.nodes.length === 0 && <EmptyCanvasNotice />}

      {connectingFromStepId && (
        <ConnectingNotice
          sourceStepId={connectingFromStepId}
          onCancel={() => setConnectingFromStepId(null)}
        />
      )}

      <div className="flex h-full min-h-[640px] flex-col rounded-none border-0 border-[var(--border-subtle)] bg-[var(--canvas-inner-bg)] shadow-none lg:rounded-2xl lg:border lg:shadow-sm">
        {!isFullscreenCanvas && (
          <CanvasMetadataPanel
            vibe={vibe}
            isEditing={isEditing}
            editingMetadataField={metadataEditor.editingMetadataField}
            metadataDraftValue={metadataEditor.metadataDraftValue}
            onStartEditing={metadataEditor.startEditingMetadata}
            onChangeDraft={metadataEditor.setMetadataDraftValue}
            onSave={metadataEditor.saveMetadataEdit}
            onCancel={metadataEditor.cancelMetadataEdit}
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
              onStartConnecting={setConnectingFromStepId}
              onClearConnectingStep={() => setConnectingFromStepId(null)}
              onAppendStepAfter={onAppendStepAfter}
              onPrependStepBefore={onPrependStepBefore}
            />
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

function EmptyCanvasNotice() {
  return (
    <div className="mb-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
      No Vibe Steps found. Unlock step editing and add a standalone step to
      start a new Vibe.
    </div>
  );
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
