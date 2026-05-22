"use client";

import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import { PanelHeader } from "./editor/PanelHeader";
import { PaneResizeHandle } from "./editor/PaneResizeHandler";
import { SourcePane, CanvasPane, InspectorPane } from "./panes";
import {
  useVibeState,
  useEditingState,
  useLayoutState,
  useGraphLayout,
  useDefaultVibeYaml,
  useCanvasResizeObserver,
  useVisualVibesEditorActions,
} from "../hooks";
import { toggleMobilePane } from "../utils";

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
  // State hooks
  const vibeState = useVibeState();
  const editingState = useEditingState();
  const layoutState = useLayoutState();
  const graphLayout = useGraphLayout(vibeState.parsedResult.graph);
  const { setFileName, setLoadError, setSourceType, setYamlText } = vibeState;

  // Refs
  const canvasPanelRef = useRef<HTMLDivElement | null>(null);
  const editorShellRef = useRef<HTMLDivElement | null>(null);

  useDefaultVibeYaml({
    setYamlText,
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
    handleAddStandaloneStep,
    handleAddErrorHandlerNode,
    handleAddStepOnEdge,
    handleDeleteStep,
    handleDeleteEdge,
    handleAppendStepAfter,
    handlePrependStepBefore,
    handleUpdateVibeMetadata,
    handleUpdateVibeStep,
    handleUpdateStepDescription,
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
                  onAddStandaloneStep={handleAddStandaloneStep}
                  onAddErrorHandlerNode={handleAddErrorHandlerNode}
                  onAddStepOnEdge={handleAddStepOnEdge}
                  onDeleteStep={handleDeleteStep}
                  onAddEdge={handleAddEdge}
                  onDeleteEdge={handleDeleteEdge}
                  onAppendStepAfter={handleAppendStepAfter}
                  onPrependStepBefore={handlePrependStepBefore}
                  onUpdateVibeMetadata={handleUpdateVibeMetadata}
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
            onAddStandaloneStep={handleAddStandaloneStep}
            onAddErrorHandlerNode={handleAddErrorHandlerNode}
            onAddStepOnEdge={handleAddStepOnEdge}
            onDeleteStep={handleDeleteStep}
            onAddEdge={handleAddEdge}
            onDeleteEdge={handleDeleteEdge}
            onAppendStepAfter={handleAppendStepAfter}
            onPrependStepBefore={handlePrependStepBefore}
            onUpdateVibeMetadata={handleUpdateVibeMetadata}
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
