"use client";

import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import {
  addEdgeInYaml,
  addErrorHandlerNodeInYaml,
  addStandaloneStepInYaml,
  addStepOnEdgeInYaml,
  appendStepAfterInYaml,
  deleteEdgeInYaml,
  deleteStepInYaml,
  prependStepBeforeInYaml,
  updateStepDescriptionInYaml,
  updateVibeMetadataInYaml,
  updateVibeStepInYaml,
} from "@/lib/visual-vibes/yaml";
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
} from "../hooks";
import {
  findAddedStepId,
  updateCanvasEditSnapshot,
  toggleMobilePane,
  revealMobileInspector,
  startPaneResize,
  calculateGridTemplateColumns,
} from "../utils";

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

  /**
   * Handles file upload and resets editor state
   */
  function handleUploadYaml(
    uploadedFileName: string,
    uploadedYamlText: string,
  ) {
    vibeState.setYamlText(uploadedYamlText);
    vibeState.setFileName(uploadedFileName);
    vibeState.setSourceType("upload");
    vibeState.setLoadError(null);
    vibeState.setSelectedStepId(null);
    editingState.setIsYamlEditing(false);
    editingState.setYamlEditSnapshot(null);
    editingState.setIsCanvasEditing(false);
    editingState.setCanvasEditSnapshot(null);
    editingState.setHasUnsavedStepEdits(false);
    graphLayout.setCanvasViewMode("flow");
  }

  /**
   * Handles step selection, with mobile layout support
   */
  function handleSelectStep(stepId: string) {
    vibeState.setSelectedStepId((currentStepId) =>
      currentStepId === stepId ? null : stepId,
    );

    // On mobile, selecting a node should reveal the inspector
    layoutState.setMobileCollapsedPanes((currentPanes) =>
      revealMobileInspector(currentPanes),
    );
  }

  /**
   * Handles adding a standalone step and centers it on canvas
   */
  function handleAddStandaloneStep() {
    const nextYamlText = addStandaloneStepInYaml(vibeState.yamlText);
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);
    editingState.setIsCanvasEditing(true);

    if (addedStepId) {
      vibeState.setSelectedStepId(addedStepId);
      graphLayout.setCenterRequest((currentRequest) => ({
        stepId: addedStepId,
        requestId: (currentRequest?.requestId ?? 0) + 1,
      }));
    }
  }

  /**
   * Handles adding an error handler node for a given source step
   */
  function handleAddErrorHandlerNode(sourceStepId: string) {
    const nextYamlText = addErrorHandlerNodeInYaml(
      vibeState.yamlText,
      sourceStepId,
    );
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);
    editingState.setIsCanvasEditing(true);

    if (addedStepId) {
      vibeState.setSelectedStepId(addedStepId);
      graphLayout.setCenterRequest((currentRequest) => ({
        stepId: addedStepId,
        requestId: (currentRequest?.requestId ?? 0) + 1,
      }));
    }
  }

  /**
   * Handles adding a step on an edge
   */
  function handleAddStepOnEdge(options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) {
    const nextYamlText = addStepOnEdgeInYaml(vibeState.yamlText, options);
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);

    if (addedStepId) {
      vibeState.setSelectedStepId(addedStepId);
      graphLayout.setCenterRequest((currentRequest) => ({
        stepId: addedStepId,
        requestId: (currentRequest?.requestId ?? 0) + 1,
      }));
    }
  }

  /**
   * Handles deleting a step with confirmation
   */
  function handleDeleteStep(stepId: string) {
    const confirmed = window.confirm(
      `Delete "${stepId}"? This will remove the step from the YAML.`,
    );

    if (!confirmed) {
      return;
    }

    vibeState.setYamlText((currentYamlText) =>
      deleteStepInYaml(currentYamlText, stepId),
    );

    if (vibeState.selectedStepId === stepId) {
      vibeState.setSelectedStepId(null);
    }

    editingState.setHasUnsavedStepEdits(false);
  }

  /**
   * Handles deleting an edge with confirmation
   */
  function handleDeleteEdge(options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) {
    const confirmed = window.confirm(
      `Delete edge from "${options.sourceStepId}" to "${options.targetStepId}"?`,
    );

    if (!confirmed) {
      return;
    }

    vibeState.setYamlText((currentYamlText) =>
      deleteEdgeInYaml(currentYamlText, options),
    );
  }

  /**
   * Handles appending a step after a given source step
   */
  function handleAppendStepAfter(sourceStepId: string) {
    const nextYamlText = appendStepAfterInYaml(
      vibeState.yamlText,
      sourceStepId,
    );
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);

    if (addedStepId) {
      vibeState.setSelectedStepId(addedStepId);
      graphLayout.setCenterRequest((currentRequest) => ({
        stepId: addedStepId,
        requestId: (currentRequest?.requestId ?? 0) + 1,
      }));
    }
  }

  /**
   * Handles prepending a step before a given target step
   */
  function handlePrependStepBefore(targetStepId: string) {
    const nextYamlText = prependStepBeforeInYaml(
      vibeState.yamlText,
      targetStepId,
    );
    const addedStepId = findAddedStepId(vibeState.yamlText, nextYamlText);

    vibeState.setYamlText(nextYamlText);

    if (addedStepId) {
      vibeState.setSelectedStepId(addedStepId);
      graphLayout.setCenterRequest((currentRequest) => ({
        stepId: addedStepId,
        requestId: (currentRequest?.requestId ?? 0) + 1,
      }));
    }
  }

  /**
   * Handles updating vibe metadata (id, name, description)
   */
  function handleUpdateVibeMetadata(
    field: "id" | "name" | "description",
    value: string,
  ) {
    vibeState.setYamlText((currentYamlText) =>
      updateVibeMetadataInYaml(currentYamlText, field, value),
    );

    // Keep the cancellation snapshot aligned when metadata is edited during canvas editing
    editingState.setCanvasEditSnapshot((currentSnapshot) =>
      updateCanvasEditSnapshot(currentSnapshot, field, value),
    );
  }

  /**
   * Handles updating a step with new properties
   */
  function handleUpdateVibeStep(
    originalStepId: string,
    updates: {
      id: string;
      functionName: string;
      input: Record<string, unknown>;
      onErrorStepId?: string;
      onErrorMessage?: string;
    },
  ) {
    vibeState.setYamlText((currentYamlText) =>
      updateVibeStepInYaml(currentYamlText, originalStepId, updates),
    );

    vibeState.setSelectedStepId(updates.id);
    editingState.setHasUnsavedStepEdits(false);
  }

  /**
   * Handles updating step description/notes
   */
  function handleUpdateStepDescription(stepId: string, description: string) {
    vibeState.setYamlText((currentYamlText) =>
      updateStepDescriptionInYaml(currentYamlText, stepId, description),
    );

    editingState.setHasUnsavedStepEdits(false);
  }

  /**
   * Handles starting YAML editing
   */
  function handleStartYamlEditing() {
    editingState.setYamlEditSnapshot(vibeState.yamlText);
    editingState.setIsYamlEditing(true);
  }

  /**
   * Handles canceling YAML editing with confirmation if changes exist
   */
  function handleCancelYamlEditing() {
    if (
      editingState.yamlEditSnapshot !== null &&
      vibeState.yamlText !== editingState.yamlEditSnapshot
    ) {
      const confirmed = window.confirm(
        "Cancel YAML editing and discard your YAML changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    if (editingState.yamlEditSnapshot !== null) {
      vibeState.setYamlText(editingState.yamlEditSnapshot);
    }

    editingState.setYamlEditSnapshot(null);
    editingState.setIsYamlEditing(false);
  }

  /**
   * Handles saving YAML editing
   */
  function handleSaveYamlEditing() {
    editingState.setYamlEditSnapshot(null);
    editingState.setIsYamlEditing(false);
  }

  /**
   * Handles starting canvas editing
   */
  function handleStartCanvasEditing() {
    editingState.setCanvasEditSnapshot(vibeState.yamlText);
    editingState.setIsCanvasEditing(true);
    editingState.setHasUnsavedStepEdits(false);
  }

  /**
   * Handles saving canvas editing
   */
  function handleSaveCanvasEditing() {
    editingState.setCanvasEditSnapshot(null);
    editingState.setIsCanvasEditing(false);
    editingState.setHasUnsavedStepEdits(false);
  }

  /**
   * Handles canceling canvas editing with confirmation if changes exist
   */
  function handleCancelCanvasEditing() {
    if (editingState.hasUnsavedStepEdits) {
      window.alert(
        "You have unsaved step edits in the Inspector. Please save or cancel those step edits before cancelling canvas editing.",
      );
      return;
    }

    const hasCanvasChanges =
      editingState.canvasEditSnapshot !== null &&
      vibeState.yamlText !== editingState.canvasEditSnapshot;

    if (hasCanvasChanges) {
      const confirmed = window.confirm(
        "Cancel canvas editing and discard your graph changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    if (editingState.canvasEditSnapshot !== null) {
      vibeState.setYamlText(editingState.canvasEditSnapshot);
    }

    editingState.setCanvasEditSnapshot(null);
    editingState.setIsCanvasEditing(false);
    vibeState.setSelectedStepId(null);
    editingState.setHasUnsavedStepEdits(false);
  }

  /**
   * Handles starting pane resize with mouse event
   */
  function handleStartPaneResize(pane: "left" | "right", startClientX: number) {
    const shell = editorShellRef.current;

    if (!shell) {
      return;
    }

    const shellWidth = shell.getBoundingClientRect().width;

    startPaneResize(
      pane,
      startClientX,
      {
        leftPaneWidth: layoutState.leftPaneWidth,
        rightPaneWidth: layoutState.rightPaneWidth,
        isLeftPaneCollapsed: layoutState.isLeftPaneCollapsed,
        isRightPaneCollapsed: layoutState.isRightPaneCollapsed,
        shellWidth,
      },
      {
        onLeftPaneWidthChange: layoutState.setLeftPaneWidth,
        onRightPaneWidthChange: layoutState.setRightPaneWidth,
        onLeftPaneCollapse: layoutState.setIsLeftPaneCollapsed,
        onRightPaneCollapse: layoutState.setIsRightPaneCollapsed,
      },
    );
  }

  // Calculate grid template columns for desktop layout
  const gridTemplateColumns = calculateGridTemplateColumns(
    layoutState.leftPaneWidth,
    layoutState.rightPaneWidth,
    layoutState.isLeftPaneCollapsed,
    layoutState.isRightPaneCollapsed,
  );

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
                  onAddEdge={(options) => {
                    vibeState.setYamlText((currentYamlText) =>
                      addEdgeInYaml(currentYamlText, options),
                    );
                  }}
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
            onAddEdge={(options) => {
              vibeState.setYamlText((currentYamlText) =>
                addEdgeInYaml(currentYamlText, options),
              );
            }}
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
