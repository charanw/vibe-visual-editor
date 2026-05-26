"use client";

import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { PanelHeader } from "./editor/PanelHeader";
import { PaneResizeHandle } from "./editor/PaneResizeHandler";
import { SourcePane, CanvasPane, InspectorPane } from "./panes";
import {
  useDefaultVibeYaml,
  useCanvasResizeObserver,
} from "../hooks";
import { useVisualVibesEditorActions } from "../state/editorActions";
import { useVisualVibesStore } from "../state/visualVibesStore";
import { toggleMobilePane } from "../utils";
import type {
  AddStepPlacement,
  AddStepWizardSelection,
} from "../types";

/**
 * VisualVibesEditor Component
 *
 * Main editor component for creating and editing Visual Vibes.
 * Manages three primary panes:
 * - Source: YAML file controls and editing
 * - Canvas: Visual graph representation
 * - Inspector: Step/node property editing
 *
 * Supports both desktop (3-pane) and mobile (collapsible) layouts.
 * Handles graph manipulation, YAML editing, and responsive resizing.
 */
export function VisualVibesEditor() {
  const store = useVisualVibesStore();
  const { vibeState, editingState, layoutState, graphLayout } = store;
  const { resetYamlText, setFileName, setLoadError, setSourceType } = vibeState;
  const [addStepRequest, setAddStepRequest] =
    useState<AddStepPlacement | null>(null);

  // Refs
  const canvasPanelRef = useRef<HTMLDivElement | null>(null);
  const editorShellRef = useRef<HTMLDivElement | null>(null);

  useDefaultVibeYaml({
    setYamlText: resetYamlText,
    setFileName,
    setSourceType,
    setLoadError,
  });

  useCanvasResizeObserver({
    canvasPanelRef,
    isDesktopLayout: layoutState.isDesktopLayout,
    isMobileCanvasCollapsed: layoutState.mobileCollapsedPanes.canvas,
  });

  const {
    gridTemplateColumns,
    handleUploadYaml,
    handleSelectStep,
    handleDeleteStep,
    handleDeleteEdge,
    handleUpdateVibeMetadata,
    handleUpdateVibeStep,
    handleUpdateStepDescription,
    handleCreateStepFromWizard,
    handleStartYamlEditing,
    handleCancelYamlEditing,
    handleSaveYamlEditing,
    handleStartCanvasEditing,
    handleSaveCanvasEditing,
    handleCancelCanvasEditing,
    handleAddEdge,
    handleStartPaneResize,
  } = useVisualVibesEditorActions({
    vibeState,
    editingState,
    layoutState,
    graphLayout,
    editorShellRef,
  });

  function requestStandaloneStep() {
    setAddStepRequest({ kind: "standalone" });
  }

  function requestAppendStepAfter(sourceStepId: string) {
    setAddStepRequest({ kind: "appendAfter", sourceStepId });
  }

  function requestPrependStepBefore(targetStepId: string) {
    setAddStepRequest({ kind: "prependBefore", targetStepId });
  }

  function requestStepOnEdge(options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) {
    setAddStepRequest({
      kind: "onEdge",
      sourceStepId: options.sourceStepId,
      targetStepId: options.targetStepId,
      edgeType: options.edgeType,
    });
  }

  function closeAddStepWizard() {
    setAddStepRequest(null);
  }

  function confirmAddStepWizard(selection: AddStepWizardSelection) {
    handleCreateStepFromWizard(selection);
    closeAddStepWizard();
  }
  // Mobile layout
  if (!layoutState.isDesktopLayout) {
    return (
      <main className="min-h-screen w-full overflow-x-hidden bg-[var(--app-bg)] text-[var(--text-primary)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[900px] flex-col border-x border-[var(--border-subtle)]">
          {/* Source pane section */}
          <section className="flex flex-col border-b border-[var(--border-subtle)] bg-[var(--panel-bg)]">
            <PanelHeader
              eyebrow="YAML"
              title="Vibe YAML"
              description="Edit the Visual Vibe definition directly."
              isCollapsedOnMobile={layoutState.mobileCollapsedPanes.source}
              onToggleMobileCollapse={() =>
                layoutState.setMobileCollapsedPanes((panes) =>
                  toggleMobilePane(panes, "source"),
                )
              }
            />

            {layoutState.shouldRenderMobileSourcePane && (
              <div className="flex min-h-[420px] flex-1 flex-col">
                <SourcePane
                  fileName={vibeState.fileName}
                  sourceType={vibeState.sourceType}
                  yamlText={vibeState.yamlText}
                  isDesktopLayout={layoutState.isDesktopLayout}
                  isYamlEditing={editingState.isYamlEditing}
                  loadError={vibeState.loadError}
                  parsedError={vibeState.parsedResult.error}
                  validationIssues={vibeState.validationIssues}
                  onUploadYaml={handleUploadYaml}
                  onLoadError={vibeState.setLoadError}
                  onYamlTextChange={vibeState.setYamlText}
                  onStartYamlEditing={handleStartYamlEditing}
                  onCancelYamlEditing={handleCancelYamlEditing}
                  onSaveYamlEditing={handleSaveYamlEditing}
                />
              </div>
            )}
          </section>

          {/* Canvas pane section */}
          <section className="flex flex-col border-b border-[var(--border-subtle)] bg-[var(--canvas-bg)]">
            <PanelHeader
              eyebrow="Visualizer"
              title="Vibe Canvas"
              description="A custom view of the YAML structure."
              isCollapsedOnMobile={layoutState.mobileCollapsedPanes.canvas}
              onToggleMobileCollapse={() =>
                layoutState.setMobileCollapsedPanes((panes) =>
                  toggleMobilePane(panes, "canvas"),
                )
              }
            />

            {layoutState.shouldRenderMobileCanvasPane && (
              <div className="flex min-h-[560px] flex-1 flex-col">
                <CanvasPane
                  canvasPanelRef={canvasPanelRef}
                  vibe={vibeState.parsedResult.vibe}
                  positionedGraph={graphLayout.positionedGraph}
                  positionedDisplayGraph={graphLayout.positionedDisplayGraph}
                  selectedStepId={vibeState.selectedStepId}
                  centerRequest={graphLayout.centerRequest}
                  canvasViewMode={graphLayout.canvasViewMode}
                  isCanvasEditing={editingState.isCanvasEditing}
                  onSelectStep={handleSelectStep}
                  onClearSelectedStep={() => vibeState.setSelectedStepId(null)}
                  onChangeViewMode={graphLayout.setCanvasViewMode}
                  onStartEditing={handleStartCanvasEditing}
                  onSaveEditing={handleSaveCanvasEditing}
                  onCancelEditing={handleCancelCanvasEditing}
                  onAddStandaloneStep={requestStandaloneStep}
                  onAddStepOnEdge={requestStepOnEdge}
                  onDeleteStep={handleDeleteStep}
                  onAddEdge={handleAddEdge}
                  onDeleteEdge={handleDeleteEdge}
                  onAppendStepAfter={requestAppendStepAfter}
                  onPrependStepBefore={requestPrependStepBefore}
                  onUpdateVibeMetadata={handleUpdateVibeMetadata}
                  addStepRequest={addStepRequest}
                  onCancelAddStepRequest={closeAddStepWizard}
                  onConfirmAddStepRequest={confirmAddStepWizard}
                  canvasViewport={layoutState.canvasViewport}
                  onCanvasViewportChange={layoutState.setCanvasViewport}
                />
              </div>
            )}
          </section>

          {/* Inspector pane section */}
          <section className="flex flex-col bg-[var(--panel-bg)]">
            <PanelHeader
              eyebrow="Inspector"
              title="Vibe Step"
              description="Edit the selected node."
              isCollapsedOnMobile={layoutState.mobileCollapsedPanes.inspector}
              onToggleMobileCollapse={() =>
                layoutState.setMobileCollapsedPanes((panes) =>
                  toggleMobilePane(panes, "inspector"),
                )
              }
            />

            {layoutState.shouldRenderMobileInspectorPane && (
              <InspectorPane
                vibe={vibeState.parsedResult.vibe}
                selectedStepId={vibeState.selectedStepId}
                selectedStepDescription={vibeState.selectedStepDescription}
                isCanvasEditing={editingState.isCanvasEditing}
                onStartEditing={handleStartCanvasEditing}
                onUpdateStep={handleUpdateVibeStep}
                onUpdateStepDescription={handleUpdateStepDescription}
                onStepEditDirtyChange={editingState.setHasUnsavedStepEdits}
              />
            )}
          </section>
        </div>
      </main>
    );
  }

  // Desktop layout
  return (
    <main className="h-screen w-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-primary)]">
      <div
        ref={editorShellRef}
        className="grid h-full w-full"
        style={{ gridTemplateColumns }}
      >
        {/* Left pane: Source */}
        <section
          className={`min-w-0 overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--panel-bg)] ${
            layoutState.isLeftPaneCollapsed
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <PanelHeader
              eyebrow="YAML"
              title="Vibe YAML"
              description="Edit the Visual Vibe definition directly."
            />

            <SourcePane
              fileName={vibeState.fileName}
              sourceType={vibeState.sourceType}
              yamlText={vibeState.yamlText}
              isDesktopLayout={layoutState.isDesktopLayout}
              isYamlEditing={editingState.isYamlEditing}
              loadError={vibeState.loadError}
              parsedError={vibeState.parsedResult.error}
              validationIssues={vibeState.validationIssues}
              onUploadYaml={handleUploadYaml}
              onLoadError={vibeState.setLoadError}
              onYamlTextChange={vibeState.setYamlText}
              onStartYamlEditing={handleStartYamlEditing}
              onCancelYamlEditing={handleCancelYamlEditing}
              onSaveYamlEditing={handleSaveYamlEditing}
            />
          </div>
        </section>

        {/* Left pane resize handle */}
        <PaneResizeHandle
          side="left"
          collapsed={layoutState.isLeftPaneCollapsed}
          onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) =>
            handleStartPaneResize("left", event.clientX)
          }
          onToggleCollapse={() =>
            layoutState.setIsLeftPaneCollapsed((currentValue) => !currentValue)
          }
        />

        {/* Center pane: Canvas */}
        <section className="flex min-h-0 min-w-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--canvas-bg)]">
          <PanelHeader
            eyebrow="Visualizer"
            title="Vibe Canvas"
            description="A custom view of the YAML structure."
          />

          <CanvasPane
            canvasPanelRef={canvasPanelRef}
            vibe={vibeState.parsedResult.vibe}
            positionedGraph={graphLayout.positionedGraph}
            positionedDisplayGraph={graphLayout.positionedDisplayGraph}
            selectedStepId={vibeState.selectedStepId}
            centerRequest={graphLayout.centerRequest}
            canvasViewMode={graphLayout.canvasViewMode}
            isCanvasEditing={editingState.isCanvasEditing}
            onSelectStep={handleSelectStep}
            onClearSelectedStep={() => vibeState.setSelectedStepId(null)}
            onChangeViewMode={graphLayout.setCanvasViewMode}
            onStartEditing={handleStartCanvasEditing}
            onSaveEditing={handleSaveCanvasEditing}
            onCancelEditing={handleCancelCanvasEditing}
            onAddStandaloneStep={requestStandaloneStep}
            onAddStepOnEdge={requestStepOnEdge}
            onDeleteStep={handleDeleteStep}
            onAddEdge={handleAddEdge}
            onDeleteEdge={handleDeleteEdge}
            onAppendStepAfter={requestAppendStepAfter}
            onPrependStepBefore={requestPrependStepBefore}
            onUpdateVibeMetadata={handleUpdateVibeMetadata}
            addStepRequest={addStepRequest}
            onCancelAddStepRequest={closeAddStepWizard}
            onConfirmAddStepRequest={confirmAddStepWizard}
            canvasViewport={layoutState.canvasViewport}
            onCanvasViewportChange={layoutState.setCanvasViewport}
          />
        </section>

        {/* Right pane resize handle */}
        <PaneResizeHandle
          side="right"
          collapsed={layoutState.isRightPaneCollapsed}
          onMouseDown={(event: ReactMouseEvent<HTMLDivElement>) =>
            handleStartPaneResize("right", event.clientX)
          }
          onToggleCollapse={() =>
            layoutState.setIsRightPaneCollapsed((currentValue) => !currentValue)
          }
        />

        {/* Right pane: Inspector */}
        <section
          className={`min-w-0 overflow-hidden bg-[var(--panel-bg)] ${
            layoutState.isRightPaneCollapsed
              ? "pointer-events-none opacity-0"
              : "opacity-100"
          }`}
        >
          <div className="flex h-full min-h-0 flex-col">
            <PanelHeader
              eyebrow="Inspector"
              title="Vibe Step"
              description="Edit the selected node."
            />

            <InspectorPane
              vibe={vibeState.parsedResult.vibe}
              selectedStepId={vibeState.selectedStepId}
              selectedStepDescription={vibeState.selectedStepDescription}
              isCanvasEditing={editingState.isCanvasEditing}
              onStartEditing={handleStartCanvasEditing}
              onUpdateStep={handleUpdateVibeStep}
              onUpdateStepDescription={handleUpdateStepDescription}
              onStepEditDirtyChange={editingState.setHasUnsavedStepEdits}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
