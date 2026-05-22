"use client";

import { useState } from "react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout";
import type { VisualVibe } from "@/lib/visual-vibes/schema";

type MetadataField = "id" | "name" | "description";

export type CanvasViewMode = "flow" | "dependency";

type VibeCanvasProps = {
  vibe: VisualVibe | null;
  graph: PositionedVibeGraph;
  selectedStepId: string | null;
  viewMode: CanvasViewMode;
  isEditing: boolean;
  onSelectStep: (stepId: string) => void;
  onClearSelectedStep: () => void;
  onChangeViewMode: (viewMode: CanvasViewMode) => void;
  onStartEditing: () => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
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

export function VibeCanvas({
  vibe,
  graph,
  selectedStepId,
  viewMode,
  isEditing,
  onSelectStep,
  onClearSelectedStep,
  onChangeViewMode,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
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

  const contentWidth =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH)) + 120
      : 1200;

  const contentHeight =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT)) + 160
      : 700;

  const incomingNodeIds = new Set(graph.edges.map((edge) => edge.target));
  const outgoingNodeIds = new Set(graph.edges.map((edge) => edge.source));
  const errorTargetNodeIds = new Set(
    graph.edges
      .filter((edge) => edge.type === "error")
      .map((edge) => edge.target),
  );

  const isSelectionMode = Boolean(selectedStepId);

  function isFirstNode(nodeId: string) {
    return !incomingNodeIds.has(nodeId);
  }

  function isFinalNode(nodeId: string) {
    return !outgoingNodeIds.has(nodeId);
  }

  function isErrorNode(nodeId: string) {
    return errorTargetNodeIds.has(nodeId);
  }

  function isDimmedNode(nodeId: string) {
    if (!selectedStepId) {
      return false;
    }

    if (nodeId === selectedStepId) {
      return false;
    }

    return !graph.edges.some(
      (edge) => edge.source === nodeId || edge.target === nodeId,
    );
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

  function getEdgePath(edge: PositionedVibeGraph["edges"][number]) {
    if (edge.type === "error") {
      const verticalMidY = (edge.sourceY + edge.targetY) / 2;

      return `M ${edge.sourceX} ${edge.sourceY} C ${edge.sourceX} ${verticalMidY}, ${edge.targetX} ${verticalMidY}, ${edge.targetX} ${edge.targetY}`;
    }

    const horizontalMidX = (edge.sourceX + edge.targetX) / 2;

    return `M ${edge.sourceX} ${edge.sourceY} C ${horizontalMidX} ${edge.sourceY}, ${horizontalMidX} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`;
  }

  return (
    <div className="relative h-full w-full overflow-auto bg-[var(--canvas-bg)] p-8">
      {graph.nodes.length === 0 && (
        <div className="mb-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
          No Vibe Steps found. Check that the YAML has a valid workflow.steps
          list.
        </div>
      )}

      {connectingFromStepId && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-[var(--brand-primary)] bg-[var(--brand-soft)] px-4 py-2 text-sm text-[var(--text-primary)]">
          <span>
            Connecting from <strong>{connectingFromStepId}</strong>. Click a
            left-side bubble on another node to finish.
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

      <div
        className="min-h-[640px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--canvas-inner-bg)] shadow-sm"
        style={{
          minWidth: Math.max(contentWidth, 760),
        }}
      >
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

        <div className="p-6">
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
                  ? "Selection mode is showing only edges connected to the selected step."
                  : viewMode === "flow"
                    ? "Flow View shows main execution and error paths."
                    : "Dependency View also shows data references from step inputs."}
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
                  onClick={() => onChangeViewMode("dependency")}
                  className={`border-l border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold ${
                    viewMode === "dependency"
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
                  }`}
                >
                  Dependency View
                </button>
              </div>

              <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                {graph.nodes.length}{" "}
                {graph.nodes.length === 1 ? "step" : "steps"}
              </div>

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
              lineClassName="border-[var(--danger)] border-dashed"
              label="Error path"
            />
            <LegendItem
              lineClassName="border-[var(--edge-color)] border-dotted"
              label="Data reference"
            />
          </div>

          <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--canvas-bg)]">
            <svg
              width="100%"
              height={contentHeight}
              viewBox={`0 0 ${contentWidth} ${contentHeight}`}
              className="block"
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
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--danger)" />
                </marker>
              </defs>

              {graph.edges.map((edge) => {
                const addButtonX = (edge.sourceX + edge.targetX) / 2;
                const addButtonY = (edge.sourceY + edge.targetY) / 2;
                const deleteButtonX = addButtonX + 34;
                const deleteButtonY = addButtonY;
                const isHovered = hoveredEdgeId === edge.id;
                const edgePath = getEdgePath(edge);

                const stroke =
                  edge.type === "error"
                    ? "var(--danger)"
                    : edge.type === "next"
                      ? "var(--brand-primary)"
                      : "var(--edge-color)";

                const markerEnd =
                  edge.type === "error"
                    ? "url(#arrow-error)"
                    : edge.type === "next"
                      ? "url(#arrow-next)"
                      : "url(#arrow-data)";

                const strokeDasharray =
                  edge.type === "error"
                    ? "7 5"
                    : edge.type === "data"
                      ? "3 5"
                      : undefined;

                return (
                  <g
                    key={edge.id}
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                  >
                    <path
                      d={edgePath}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="24"
                      pointerEvents="stroke"
                    />

                    <path
                      d={edgePath}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={edge.type === "error" ? "2.5" : "2"}
                      strokeDasharray={strokeDasharray}
                      markerEnd={markerEnd}
                      opacity={edge.type === "data" ? "0.45" : "1"}
                      pointerEvents="none"
                    />

                    {edge.type === "error" && (
                      <text
                        x={addButtonX}
                        y={addButtonY - 12}
                        textAnchor="middle"
                        fill="var(--danger)"
                        fontSize="10"
                        fontWeight="700"
                        pointerEvents="none"
                      >
                        ERROR
                      </text>
                    )}

                    {edge.type === "data" && (
                      <text
                        x={addButtonX}
                        y={addButtonY - 12}
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
                          transform={`translate(${addButtonX}, ${addButtonY})`}
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
                            r="14"
                            fill="var(--panel-bg)"
                            stroke={
                              edge.type === "error"
                                ? "var(--danger)"
                                : "var(--brand-primary)"
                            }
                            strokeWidth="2"
                          />
                          <text
                            x="0"
                            y="5"
                            textAnchor="middle"
                            fill={
                              edge.type === "error"
                                ? "var(--danger)"
                                : "var(--brand-primary)"
                            }
                            fontSize="18"
                            fontWeight="700"
                            pointerEvents="none"
                          >
                            +
                          </text>
                        </g>

                        <g
                          transform={`translate(${deleteButtonX}, ${deleteButtonY})`}
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
                            r="14"
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
                const isErrorHandlerNode = isErrorNode(node.id);
                const isDimmed = isDimmedNode(node.id);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => onSelectStep(node.id)}
                    className="cursor-pointer"
                    opacity={isDimmed ? "0.28" : "1"}
                  >
                    <rect
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx="16"
                      fill={
                        isSelected
                          ? "var(--node-selected-bg)"
                          : isErrorHandlerNode
                            ? "var(--danger-soft)"
                            : "var(--node-bg)"
                      }
                      stroke={
                        isSelected
                          ? "var(--node-selected-border)"
                          : isErrorHandlerNode
                            ? "var(--danger)"
                            : "var(--node-border)"
                      }
                      strokeWidth={
                        isSelected || isErrorHandlerNode ? "2.5" : "2"
                      }
                    />

                    {isEditing && isHovered && (
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
                    )}

                    {isEditing && isHovered && (
                      <>
                        <g
                          transform={`translate(${NODE_WIDTH + 10}, ${NODE_HEIGHT / 2})`}
                          onClick={(event) => {
                            event.stopPropagation();

                            if (isFinalNode(node.id)) {
                              onAppendStepAfter(node.id);
                              return;
                            }

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
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fill="var(--brand-primary)"
                            fontSize="12"
                            fontWeight="700"
                            pointerEvents="none"
                          >
                            +
                          </text>
                        </g>

                        <g
                          transform={`translate(${-10}, ${NODE_HEIGHT / 2})`}
                          onClick={(event) => {
                            event.stopPropagation();

                            if (!connectingFromStepId && isFirstNode(node.id)) {
                              onPrependStepBefore(node.id);
                              return;
                            }

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
                          className="cursor-crosshair"
                        >
                          <circle
                            r="10"
                            fill={
                              connectingFromStepId &&
                              connectingFromStepId !== node.id
                                ? "var(--brand-soft)"
                                : "var(--panel-bg)"
                            }
                            stroke="var(--brand-primary)"
                            strokeWidth="2"
                          />
                          <text
                            x="0"
                            y="4"
                            textAnchor="middle"
                            fill="var(--brand-primary)"
                            fontSize="12"
                            fontWeight="700"
                            pointerEvents="none"
                          >
                            +
                          </text>
                        </g>
                      </>
                    )}

                    <text
                      x="18"
                      y="34"
                      fill={
                        isErrorHandlerNode
                          ? "var(--danger)"
                          : "var(--brand-primary)"
                      }
                      fontSize="11"
                      fontWeight="700"
                      letterSpacing="1.4"
                      pointerEvents="none"
                    >
                      {isErrorHandlerNode ? "ERROR STEP" : "VIBE STEP"}
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
            </svg>
          </div>
        </div>
      </div>
    </div>
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
