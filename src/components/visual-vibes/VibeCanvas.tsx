"use client";

import { useState } from "react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout";
import type { VisualVibe } from "@/lib/visual-vibes/schema";

type VibeCanvasProps = {
  vibe: VisualVibe | null;
  graph: PositionedVibeGraph;
  selectedStepId: string | null;
  isEditing: boolean;
  onSelectStep: (stepId: string) => void;
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
};

export function VibeCanvas({
  vibe,
  graph,
  selectedStepId,
  isEditing,
  onSelectStep,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onAddStepOnEdge,
  onDeleteStep,
  onAddEdge,
  onDeleteEdge,
  onAppendStepAfter,
  onPrependStepBefore,
}: VibeCanvasProps) {
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [connectingFromStepId, setConnectingFromStepId] = useState<
    string | null
  >(null);

  const contentWidth =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH)) + 120
      : 1200;

  const contentHeight =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT)) + 120
      : 700;

  const incomingNodeIds = new Set(graph.edges.map((edge) => edge.target));
  const outgoingNodeIds = new Set(graph.edges.map((edge) => edge.source));

  function isFirstNode(nodeId: string) {
    return !incomingNodeIds.has(nodeId);
  }

  function isFinalNode(nodeId: string) {
    return !outgoingNodeIds.has(nodeId);
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
              {isEditing ? "Editing enabled" : "Editing locked"}
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Vibe ID
              </div>
              <div className="mt-1 break-words text-sm font-semibold text-[var(--text-primary)]">
                {vibe?.workflow.id ?? "No vibe loaded"}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Name
              </div>
              <div className="mt-1 break-words text-lg font-semibold text-[var(--text-primary)]">
                {vibe?.workflow.name ?? "Untitled Visual Vibe"}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Description
              </div>
              <p className="mt-1 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                {vibe?.workflow.description ?? "No description available."}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
                Steps
              </div>
              <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                Visual Step Flow
              </h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Steps are arranged based on references, next-step relationships,
                and available canvas width.
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                  Unlock editing
                </button>
              )}
            </div>
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
                  id="arrow"
                  markerWidth="10"
                  markerHeight="10"
                  refX="8"
                  refY="3"
                  orient="auto"
                  markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill="var(--edge-color)" />
                </marker>
              </defs>

              {graph.edges.map((edge) => {
                const midX = (edge.sourceX + edge.targetX) / 2;
                const addButtonX = (edge.sourceX + edge.targetX) / 2;
                const addButtonY = (edge.sourceY + edge.targetY) / 2;
                const deleteButtonX = addButtonX + 34;
                const deleteButtonY = addButtonY;
                const isHovered = hoveredEdgeId === edge.id;

                return (
                  <g
                    key={edge.id}
                    onMouseEnter={() => setHoveredEdgeId(edge.id)}
                    onMouseLeave={() => setHoveredEdgeId(null)}
                  >
                    <path
                      d={`M ${edge.sourceX} ${edge.sourceY} C ${midX} ${edge.sourceY}, ${midX} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="24"
                      pointerEvents="stroke"
                    />

                    <path
                      d={`M ${edge.sourceX} ${edge.sourceY} C ${midX} ${edge.sourceY}, ${midX} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`}
                      fill="none"
                      stroke="var(--edge-color)"
                      strokeWidth="2"
                      markerEnd="url(#arrow)"
                      pointerEvents="none"
                    />

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
                            stroke="var(--brand-primary)"
                            strokeWidth="2"
                          />
                          <text
                            x="0"
                            y="5"
                            textAnchor="middle"
                            fill="var(--brand-primary)"
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

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => onSelectStep(node.id)}
                    className="cursor-pointer"
                  >
                    <rect
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx="16"
                      fill={
                        isSelected
                          ? "var(--node-selected-bg)"
                          : "var(--node-bg)"
                      }
                      stroke={
                        isSelected
                          ? "var(--node-selected-border)"
                          : "var(--node-border)"
                      }
                      strokeWidth="2"
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
                      fill="var(--brand-primary)"
                      fontSize="11"
                      fontWeight="700"
                      letterSpacing="1.4"
                      pointerEvents="none"
                    >
                      VIBE STEP
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
