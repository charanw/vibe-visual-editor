"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  addEdgeInYaml,
  addErrorHandlerNodeInYaml,
  addStandaloneStepInYaml,
  addStepOnEdgeInYaml,
  appendStepAfterInYaml,
  deleteEdgeInYaml,
  deleteStepInYaml,
  getStepDescriptionFromYaml,
  parseVisualVibeYaml,
  prependStepBeforeInYaml,
  updateStepDescriptionInYaml,
  updateVibeMetadataInYaml,
  updateVibeStepInYaml,
} from "@/lib/visual-vibes/yaml";
import { validateVisualVibeYaml } from "@/lib/visual-vibes/validation";
import { visualVibeToGraph } from "@/lib/visual-vibes/graph";
import type { VibeGraph } from "@/lib/visual-vibes/graph";
import { layoutVibeGraph } from "@/lib/visual-vibes/layout";
import { visualVibesAppConfig } from "@/lib/visual-vibes/appConfig";
import { VibeFileControls } from "./VibeFileControls";
import { VibeYamlEditor } from "./VibeYamlEditor";
import { VibeCanvas, type CanvasViewMode } from "./VibeCanvas";
import { VibeInspector } from "./VibeInspector";

const MIN_LEFT_PANE_WIDTH = 280;
const MIN_RIGHT_PANE_WIDTH = 280;
const MIN_CENTER_PANE_WIDTH = 420;

type MobilePaneId = "source" | "canvas" | "inspector";

type MobileCollapsedPanes = Record<MobilePaneId, boolean>;

export function VisualVibesEditor() {
  const [yamlText, setYamlText] = useState("");
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [centerRequest, setCenterRequest] = useState<{
    stepId: string;
    requestId: number;
  } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"default" | "upload">("default");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(1000);
  const [canvasViewMode, setCanvasViewMode] = useState<CanvasViewMode>("flow");

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

  const canvasPanelRef = useRef<HTMLDivElement | null>(null);
  const editorShellRef = useRef<HTMLDivElement | null>(null);

  const parsedResult = useMemo(() => {
    if (yamlText.trim().length === 0) {
      return {
        vibe: null,
        graph: null,
        error: null,
      };
    }

    try {
      const vibe = parseVisualVibeYaml(yamlText);
      const graph = visualVibeToGraph(vibe);

      return {
        vibe,
        graph,
        error: null,
      };
    } catch (error) {
      return {
        vibe: null,
        graph: null,
        error: error instanceof Error ? error.message : "Invalid YAML",
      };
    }
  }, [yamlText]);

  const validationIssues = useMemo(() => {
    return validateVisualVibeYaml(yamlText);
  }, [yamlText]);

  const selectedStepDescription = useMemo(() => {
    if (!selectedStepId) {
      return "";
    }

    return getStepDescriptionFromYaml(yamlText, selectedStepId);
  }, [yamlText, selectedStepId]);

  const displayGraph = useMemo(() => {
    return parsedResult.graph;
  }, [parsedResult.graph]);

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

    return layoutVibeGraph(displayGraph, canvasWidth);
  }, [displayGraph, canvasWidth]);

  const positionedGraph = useMemo(() => {
    if (!visibleGraph) {
      return { nodes: [], edges: [] };
    }

    return layoutVibeGraph(visibleGraph, canvasWidth, {
      mode: canvasViewMode,
    });
  }, [visibleGraph, canvasWidth, canvasViewMode]);

  const gridTemplateColumns = `${
    isLeftPaneCollapsed ? 0 : leftPaneWidth
  }px 12px minmax(${MIN_CENTER_PANE_WIDTH}px, 1fr) 12px ${
    isRightPaneCollapsed ? 0 : rightPaneWidth
  }px`;

  const shouldRenderMobileSourcePane = !mobileCollapsedPanes.source;
  const shouldRenderMobileCanvasPane = !mobileCollapsedPanes.canvas;
  const shouldRenderMobileInspectorPane = !mobileCollapsedPanes.inspector;

  useEffect(() => {
    async function loadDefaultVibeYaml() {
      try {
        const response = await fetch("/vibes/example-vibe.yml");

        if (!response.ok) {
          throw new Error(`Failed to load YAML file: ${response.status}`);
        }

        const text = await response.text();

        setYamlText(text);
        setFileName("example-vibe.yml");
        setSourceType("default");
        setLoadError(null);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load YAML file",
        );
      }
    }

    loadDefaultVibeYaml();
  }, []);

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

  useEffect(() => {
    const element = canvasPanelRef.current;

    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setCanvasWidth(entry.contentRect.width);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [isDesktopLayout, mobileCollapsedPanes.canvas]);

  function toggleMobilePane(paneId: MobilePaneId) {
    setMobileCollapsedPanes((currentPanes) => {
      const nextPanes = {
        ...currentPanes,
        [paneId]: !currentPanes[paneId],
      };

      const areAllPanesCollapsed =
        nextPanes.source && nextPanes.canvas && nextPanes.inspector;

      if (areAllPanesCollapsed) {
        return {
          ...nextPanes,
          canvas: false,
        };
      }

      return nextPanes;
    });
  }

  function requestCenterOnStep(stepId: string) {
    setSelectedStepId(stepId);
    setCenterRequest((currentRequest) => ({
      stepId,
      requestId: (currentRequest?.requestId ?? 0) + 1,
    }));
  }

  function findAddedStepId(previousYamlText: string, nextYamlText: string) {
    try {
      const previousVibe = previousYamlText.trim()
        ? parseVisualVibeYaml(previousYamlText)
        : null;
      const nextVibe = parseVisualVibeYaml(nextYamlText);

      const previousStepIds = new Set(
        previousVibe?.workflow.steps.map((step) => step.id) ?? [],
      );

      const addedStep = nextVibe.workflow.steps.find(
        (step) => !previousStepIds.has(step.id),
      );

      return addedStep?.id ?? null;
    } catch {
      return null;
    }
  }

  function handleStartPaneResize(pane: "left" | "right", startClientX: number) {
    const shell = editorShellRef.current;

    if (!shell) {
      return;
    }

    const startingLeftWidth = leftPaneWidth;
    const startingRightWidth = rightPaneWidth;
    const shellWidth = shell.getBoundingClientRect().width;

    function handleMouseMove(event: MouseEvent) {
      const deltaX = event.clientX - startClientX;

      if (pane === "left") {
        setIsLeftPaneCollapsed(false);

        const maxLeftWidth = Math.max(
          MIN_LEFT_PANE_WIDTH,
          shellWidth -
            MIN_CENTER_PANE_WIDTH -
            (isRightPaneCollapsed ? 0 : rightPaneWidth) -
            24,
        );

        setLeftPaneWidth(
          clamp(startingLeftWidth + deltaX, MIN_LEFT_PANE_WIDTH, maxLeftWidth),
        );
      }

      if (pane === "right") {
        setIsRightPaneCollapsed(false);

        const maxRightWidth = Math.max(
          MIN_RIGHT_PANE_WIDTH,
          shellWidth -
            MIN_CENTER_PANE_WIDTH -
            (isLeftPaneCollapsed ? 0 : leftPaneWidth) -
            24,
        );

        setRightPaneWidth(
          clamp(
            startingRightWidth - deltaX,
            MIN_RIGHT_PANE_WIDTH,
            maxRightWidth,
          ),
        );
      }
    }

    function handleMouseUp() {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }

  function handleSelectStep(stepId: string) {
    setSelectedStepId((currentStepId) =>
      currentStepId === stepId ? null : stepId,
    );

    setMobileCollapsedPanes((currentPanes) => ({
      ...currentPanes,
      inspector: false,
    }));
  }

  function handleClearSelectedStep() {
    setSelectedStepId(null);
  }

  function handleAddStandaloneStep() {
    const nextYamlText = addStandaloneStepInYaml(yamlText);
    const addedStepId = findAddedStepId(yamlText, nextYamlText);

    setYamlText(nextYamlText);
    setIsCanvasEditing(true);

    if (addedStepId) {
      requestCenterOnStep(addedStepId);
    }
  }

  function handleAddErrorHandlerNode(sourceStepId: string) {
    const nextYamlText = addErrorHandlerNodeInYaml(yamlText, sourceStepId);
    const addedStepId = findAddedStepId(yamlText, nextYamlText);

    setYamlText(nextYamlText);
    setIsCanvasEditing(true);

    if (addedStepId) {
      requestCenterOnStep(addedStepId);
    }
  }

  function handleAddStepOnEdge(options: {
    sourceStepId: string;
    targetStepId: string;
    edgeType: "data" | "next" | "error";
  }) {
    const nextYamlText = addStepOnEdgeInYaml(yamlText, options);
    const addedStepId = findAddedStepId(yamlText, nextYamlText);

    setYamlText(nextYamlText);

    if (addedStepId) {
      requestCenterOnStep(addedStepId);
    }
  }

  function handleDeleteStep(stepId: string) {
    const confirmed = window.confirm(
      `Delete "${stepId}"? This will remove the step from the YAML.`,
    );

    if (!confirmed) {
      return;
    }

    setYamlText((currentYamlText) => deleteStepInYaml(currentYamlText, stepId));

    setSelectedStepId((currentSelectedStepId) =>
      currentSelectedStepId === stepId ? null : currentSelectedStepId,
    );

    setHasUnsavedStepEdits(false);
  }

  function handleAddEdge(options: {
    sourceStepId: string;
    targetStepId: string;
  }) {
    setYamlText((currentYamlText) => addEdgeInYaml(currentYamlText, options));
  }

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

    setYamlText((currentYamlText) =>
      deleteEdgeInYaml(currentYamlText, options),
    );
  }

  function handleAppendStepAfter(sourceStepId: string) {
    const nextYamlText = appendStepAfterInYaml(yamlText, sourceStepId);
    const addedStepId = findAddedStepId(yamlText, nextYamlText);

    setYamlText(nextYamlText);

    if (addedStepId) {
      requestCenterOnStep(addedStepId);
    }
  }

  function handlePrependStepBefore(targetStepId: string) {
    const nextYamlText = prependStepBeforeInYaml(yamlText, targetStepId);
    const addedStepId = findAddedStepId(yamlText, nextYamlText);

    setYamlText(nextYamlText);

    if (addedStepId) {
      requestCenterOnStep(addedStepId);
    }
  }

  function handleUpdateVibeMetadata(
    field: "id" | "name" | "description",
    value: string,
  ) {
    setYamlText((currentYamlText) =>
      updateVibeMetadataInYaml(currentYamlText, field, value),
    );

    setCanvasEditSnapshot((currentSnapshot) =>
      currentSnapshot
        ? updateVibeMetadataInYaml(currentSnapshot, field, value)
        : currentSnapshot,
    );
  }

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
    setYamlText((currentYamlText) =>
      updateVibeStepInYaml(currentYamlText, originalStepId, updates),
    );

    setSelectedStepId(updates.id);
    setHasUnsavedStepEdits(false);
  }

  function handleUpdateStepDescription(stepId: string, description: string) {
    setYamlText((currentYamlText) =>
      updateStepDescriptionInYaml(currentYamlText, stepId, description),
    );

    setHasUnsavedStepEdits(false);
  }

  function handleStartCanvasEditing() {
    setCanvasEditSnapshot(yamlText);
    setIsCanvasEditing(true);
    setHasUnsavedStepEdits(false);
  }

  function handleSaveCanvasEditing() {
    setCanvasEditSnapshot(null);
    setIsCanvasEditing(false);
    setHasUnsavedStepEdits(false);
  }

  function handleCancelCanvasEditing() {
    if (hasUnsavedStepEdits) {
      window.alert(
        "You have unsaved step edits in the Inspector. Please save or cancel those step edits before cancelling canvas editing.",
      );
      return;
    }

    const hasCanvasChanges =
      canvasEditSnapshot !== null && yamlText !== canvasEditSnapshot;

    if (hasCanvasChanges) {
      const confirmed = window.confirm(
        "Cancel canvas editing and discard your graph changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    if (canvasEditSnapshot !== null) {
      setYamlText(canvasEditSnapshot);
    }

    setCanvasEditSnapshot(null);
    setIsCanvasEditing(false);
    setSelectedStepId(null);
    setHasUnsavedStepEdits(false);
  }

  function handleStartYamlEditing() {
    setYamlEditSnapshot(yamlText);
    setIsYamlEditing(true);
  }

  function handleSaveYamlEditing() {
    setYamlEditSnapshot(null);
    setIsYamlEditing(false);
  }

  function handleCancelYamlEditing() {
    if (yamlEditSnapshot !== null && yamlText !== yamlEditSnapshot) {
      const confirmed = window.confirm(
        "Cancel YAML editing and discard your YAML changes?",
      );

      if (!confirmed) {
        return;
      }
    }

    if (yamlEditSnapshot !== null) {
      setYamlText(yamlEditSnapshot);
    }

    setYamlEditSnapshot(null);
    setIsYamlEditing(false);
  }

  const sourcePaneBody = (
    <>
      <VibeFileControls
        fileName={fileName}
        sourceType={sourceType}
        yamlText={yamlText}
        onUploadYaml={(uploadedFileName, uploadedYamlText) => {
          setYamlText(uploadedYamlText);
          setFileName(uploadedFileName);
          setSourceType("upload");
          setLoadError(null);
          setSelectedStepId(null);
          setCenterRequest(null);
          setIsYamlEditing(false);
          setYamlEditSnapshot(null);
          setIsCanvasEditing(false);
          setCanvasEditSnapshot(null);
          setHasUnsavedStepEdits(false);
          setCanvasViewMode("flow");
        }}
        onError={setLoadError}
      />

      {loadError && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--danger-soft)] px-4 py-2 text-sm text-[var(--danger)]">
          {loadError}
        </div>
      )}

      {parsedResult.error && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--danger-soft)] px-4 py-2 text-sm text-[var(--danger)]">
          {parsedResult.error}
        </div>
      )}

      {validationIssues.length > 0 && (
        <div className="max-h-40 overflow-auto border-b border-[var(--border-subtle)] bg-yellow-500/10 px-4 py-3 text-xs text-yellow-700 dark:text-yellow-300">
          <div className="mb-2 font-semibold">
            Vibe validation found {validationIssues.length}{" "}
            {validationIssues.length === 1 ? "issue" : "issues"}:
          </div>

          <ul className="space-y-1">
            {validationIssues.map((issue, index) => (
              <li key={`${issue.level}-${issue.stepId ?? "workflow"}-${index}`}>
                <span className="font-semibold uppercase">{issue.level}:</span>{" "}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-2">
        <div>
          <div className="text-xs font-semibold text-[var(--text-primary)]">
            YAML Editing
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {isYamlEditing ? "Editing enabled" : "Editing locked"}
          </div>
        </div>

        {isYamlEditing ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCancelYamlEditing}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveYamlEditing}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartYamlEditing}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
          >
            Unlock YAML
          </button>
        )}
      </div>

      <div className="h-[420px] min-h-[420px] overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
        <VibeYamlEditor
          key={isDesktopLayout ? "desktop-yaml-editor" : "mobile-yaml-editor"}
          value={yamlText}
          readOnly={!isYamlEditing}
          onChange={setYamlText}
        />
      </div>
    </>
  );

  const canvasPaneBody = (
    <>
      <div className="min-h-[560px] flex-1 lg:min-h-0" ref={canvasPanelRef}>
        <VibeCanvas
          vibe={parsedResult.vibe}
          graph={positionedGraph}
          classificationGraph={positionedDisplayGraph}
          selectedStepId={selectedStepId}
          centerRequest={centerRequest}
          viewMode={canvasViewMode}
          isEditing={isCanvasEditing}
          onSelectStep={handleSelectStep}
          onClearSelectedStep={handleClearSelectedStep}
          onChangeViewMode={setCanvasViewMode}
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

      <AppFooter />
    </>
  );

  const inspectorPaneBody = (
    <div className="min-h-[480px] flex-1 overflow-auto lg:min-h-0">
      <VibeInspector
        vibe={parsedResult.vibe}
        selectedStepId={selectedStepId}
        selectedStepDescription={selectedStepDescription}
        isEditing={isCanvasEditing}
        onStartEditing={handleStartCanvasEditing}
        onUpdateStep={handleUpdateVibeStep}
        onUpdateStepDescription={handleUpdateStepDescription}
        onStepEditDirtyChange={setHasUnsavedStepEdits}
      />
    </div>
  );

  if (!isDesktopLayout) {
    return (
      <main className="min-h-screen w-full overflow-x-hidden bg-[var(--app-bg)] text-[var(--text-primary)]">
        <div className="mx-auto flex min-h-screen w-full max-w-[900px] flex-col border-x border-[var(--border-subtle)]">
          <section className="flex flex-col border-b border-[var(--border-subtle)] bg-[var(--panel-bg)]">
            <PanelHeader
              eyebrow="YAML"
              title="Vibe YAML"
              description="Edit the Visual Vibe definition directly."
              isCollapsedOnMobile={mobileCollapsedPanes.source}
              onToggleMobileCollapse={() => toggleMobilePane("source")}
            />

            {shouldRenderMobileSourcePane && (
              <div className="flex min-h-[420px] flex-1 flex-col">
                {sourcePaneBody}
              </div>
            )}
          </section>

          <section className="flex flex-col border-b border-[var(--border-subtle)] bg-[var(--canvas-bg)]">
            <PanelHeader
              eyebrow="Visualizer"
              title="Vibe Canvas"
              description="A custom view of the YAML structure."
              isCollapsedOnMobile={mobileCollapsedPanes.canvas}
              onToggleMobileCollapse={() => toggleMobilePane("canvas")}
            />

            {shouldRenderMobileCanvasPane && (
              <div className="flex min-h-[560px] flex-1 flex-col">
                {canvasPaneBody}
              </div>
            )}
          </section>

          <section className="flex flex-col bg-[var(--panel-bg)]">
            <PanelHeader
              eyebrow="Inspector"
              title="Vibe Step"
              description="Edit the selected node."
              isCollapsedOnMobile={mobileCollapsedPanes.inspector}
              onToggleMobileCollapse={() => toggleMobilePane("inspector")}
            />

            {shouldRenderMobileInspectorPane && inspectorPaneBody}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-[var(--app-bg)] text-[var(--text-primary)]">
      <div
        ref={editorShellRef}
        className="grid h-full w-full"
        style={{ gridTemplateColumns }}
      >
        <section
          className={`min-w-0 overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--panel-bg)] ${
            isLeftPaneCollapsed
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

            {sourcePaneBody}
          </div>
        </section>

        <PaneResizeHandle
          side="left"
          collapsed={isLeftPaneCollapsed}
          onMouseDown={(event) => handleStartPaneResize("left", event.clientX)}
          onToggleCollapse={() =>
            setIsLeftPaneCollapsed((currentValue) => !currentValue)
          }
        />

        <section className="flex min-h-0 min-w-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--canvas-bg)]">
          <PanelHeader
            eyebrow="Visualizer"
            title="Vibe Canvas"
            description="A custom view of the YAML structure."
          />

          {canvasPaneBody}
        </section>

        <PaneResizeHandle
          side="right"
          collapsed={isRightPaneCollapsed}
          onMouseDown={(event) => handleStartPaneResize("right", event.clientX)}
          onToggleCollapse={() =>
            setIsRightPaneCollapsed((currentValue) => !currentValue)
          }
        />

        <section
          className={`min-w-0 overflow-hidden bg-[var(--panel-bg)] ${
            isRightPaneCollapsed
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

            {inspectorPaneBody}
          </div>
        </section>
      </div>
    </main>
  );
}

function getFlowGraph(graph: VibeGraph): VibeGraph {
  const mainFlowNodeIds = getMainFlowNodeIds(graph);

  return {
    nodes: graph.nodes.filter((node) => mainFlowNodeIds.has(node.id)),
    edges: graph.edges.filter(
      (edge) =>
        edge.type === "next" &&
        mainFlowNodeIds.has(edge.source) &&
        mainFlowNodeIds.has(edge.target),
    ),
  };
}

function getMainFlowNodeIds(graph: VibeGraph) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const errorTargetIds = new Set(
    graph.edges
      .filter((edge) => edge.type === "error")
      .map((edge) => edge.target),
  );

  const incomingNextCountByNode = new Map<string, number>();
  const nextTargetsBySource = new Map<string, string[]>();

  for (const nodeId of nodeIds) {
    incomingNextCountByNode.set(nodeId, 0);
    nextTargetsBySource.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    if (edge.type !== "next") {
      continue;
    }

    nextTargetsBySource.get(edge.source)?.push(edge.target);
    incomingNextCountByNode.set(
      edge.target,
      (incomingNextCountByNode.get(edge.target) ?? 0) + 1,
    );
  }

  const startingNodeIds = graph.nodes
    .filter((node) => {
      const hasIncomingNext = (incomingNextCountByNode.get(node.id) ?? 0) > 0;

      return !hasIncomingNext && !errorTargetIds.has(node.id);
    })
    .map((node) => node.id);

  const mainFlowNodeIds = new Set<string>();
  const queue = [...startingNodeIds];

  while (queue.length > 0) {
    const nodeId = queue.shift();

    if (!nodeId || mainFlowNodeIds.has(nodeId)) {
      continue;
    }

    mainFlowNodeIds.add(nodeId);

    const nextTargets = nextTargetsBySource.get(nodeId) ?? [];

    for (const targetId of nextTargets) {
      if (!mainFlowNodeIds.has(targetId)) {
        queue.push(targetId);
      }
    }
  }

  return mainFlowNodeIds;
}

function getErrorGraph(graph: VibeGraph): VibeGraph {
  const mainFlowNodeIds = getMainFlowNodeIds(graph);
  const errorEdges = graph.edges.filter(
    (edge) => edge.type === "error" && mainFlowNodeIds.has(edge.source),
  );
  const errorSourceIds = new Set(errorEdges.map((edge) => edge.source));
  const errorTargetIds = new Set(errorEdges.map((edge) => edge.target));
  const errorHandlingIds = expandErrorHandlingIds(
    graph,
    errorTargetIds,
    mainFlowNodeIds,
  );

  const visibleNodeIds = new Set<string>();

  for (const nodeId of errorSourceIds) {
    visibleNodeIds.add(nodeId);
  }

  for (const nodeId of errorHandlingIds) {
    visibleNodeIds.add(nodeId);
  }

  const visibleEdges = graph.edges.filter((edge) => {
    if (edge.type === "error") {
      return (
        errorSourceIds.has(edge.source) && errorHandlingIds.has(edge.target)
      );
    }

    return (
      edge.type === "next" &&
      errorHandlingIds.has(edge.source) &&
      errorHandlingIds.has(edge.target)
    );
  });

  for (const edge of visibleEdges) {
    visibleNodeIds.add(edge.source);
    visibleNodeIds.add(edge.target);
  }

  return {
    nodes: graph.nodes.filter((node) => visibleNodeIds.has(node.id)),
    edges: visibleEdges,
  };
}

function expandErrorHandlingIds(
  graph: VibeGraph,
  initialIds: Set<string>,
  stopIds: Set<string>,
) {
  const errorHandlingIds = new Set(initialIds);

  let changed = true;

  while (changed) {
    changed = false;

    for (const edge of graph.edges) {
      if (edge.type !== "next") {
        continue;
      }

      if (!errorHandlingIds.has(edge.source)) {
        continue;
      }

      if (stopIds.has(edge.target)) {
        continue;
      }

      if (!errorHandlingIds.has(edge.target)) {
        errorHandlingIds.add(edge.target);
        changed = true;
      }
    }
  }

  return errorHandlingIds;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type PaneResizeHandleProps = {
  side: "left" | "right";
  collapsed: boolean;
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onToggleCollapse: () => void;
};

function PaneResizeHandle({
  side,
  collapsed,
  onMouseDown,
  onToggleCollapse,
}: PaneResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="group relative flex cursor-col-resize items-center justify-center bg-[var(--panel-bg)] hover:bg-[var(--brand-soft)]"
      title="Drag to resize"
    >
      <div className="h-full w-px bg-[var(--border-subtle)] group-hover:bg-[var(--brand-primary)]" />

      <button
        type="button"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onToggleCollapse();
        }}
        className="absolute top-4 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)] text-[10px] font-bold text-[var(--text-muted)] shadow-sm hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
        title={collapsed ? "Expand pane" : "Collapse pane"}
      >
        {side === "left" ? (collapsed ? "›" : "‹") : collapsed ? "‹" : "›"}
      </button>
    </div>
  );
}

type PanelHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  isCollapsedOnMobile?: boolean;
  onToggleMobileCollapse?: () => void;
};

function PanelHeader({
  eyebrow,
  title,
  description,
  isCollapsedOnMobile = false,
  onToggleMobileCollapse,
}: PanelHeaderProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
            {eyebrow}
          </div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
        </div>

        {onToggleMobileCollapse && (
          <button
            type="button"
            onClick={onToggleMobileCollapse}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]"
            aria-label={
              isCollapsedOnMobile
                ? `Expand ${title} panel`
                : `Collapse ${title} panel`
            }
            title={isCollapsedOnMobile ? "Expand panel" : "Collapse panel"}
          >
            <ChevronIcon isCollapsed={isCollapsedOnMobile} />
          </button>
        )}
      </div>
    </div>
  );
}

function ChevronIcon({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`transition-transform ${
        isCollapsed ? "-rotate-90" : "rotate-0"
      }`}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AppFooter() {
  return (
    <footer className="sticky bottom-0 z-20 border-t border-[var(--border-subtle)] bg-[var(--panel-bg)] px-4 py-2 text-[10px] text-[var(--text-muted)] shadow-[0_-8px_18px_rgba(0,0,0,0.18)] lg:static lg:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>Author: {visualVibesAppConfig.authorName}</span>
        <span>Version {visualVibesAppConfig.version}</span>
        <span>Last updated: {visualVibesAppConfig.lastUpdated}</span>
      </div>
    </footer>
  );
}
