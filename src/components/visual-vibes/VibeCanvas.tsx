"use client";

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
  onSelectStep: (stepId: string) => void;
};

export function VibeCanvas({
  vibe,
  graph,
  selectedStepId,
  onSelectStep,
}: VibeCanvasProps) {
  const contentWidth =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH)) + 120
      : 1200;

  const contentHeight =
    graph.nodes.length > 0
      ? Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT)) + 120
      : 700;

  return (
    <div className="h-full w-full overflow-auto bg-[var(--canvas-bg)] p-8">
      {graph.nodes.length === 0 && (
        <div className="mb-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-4 py-3 text-sm text-[var(--text-muted)]">
          No Vibe Steps found. Check that the YAML has a valid workflow.steps
          list.
        </div>
      )}

      <div
        className="min-h-[640px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--canvas-inner-bg)] shadow-sm"
        style={{
          minWidth: Math.max(contentWidth, 760),
        }}
      >
        <div className="border-b border-[var(--border-subtle)] bg-[var(--panel-bg)] px-5 py-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-primary)]">
            Visual Vibe
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

            <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
              {graph.nodes.length} {graph.nodes.length === 1 ? "step" : "steps"}
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

                return (
                  <path
                    key={edge.id}
                    d={`M ${edge.sourceX} ${edge.sourceY} C ${midX} ${edge.sourceY}, ${midX} ${edge.targetY}, ${edge.targetX} ${edge.targetY}`}
                    fill="none"
                    stroke="var(--edge-color)"
                    strokeWidth="2"
                    markerEnd="url(#arrow)"
                  />
                );
              })}

              {graph.nodes.map((node) => {
                const isSelected = selectedStepId === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
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

                    <text
                      x="18"
                      y="34"
                      fill="var(--brand-primary)"
                      fontSize="11"
                      fontWeight="700"
                      letterSpacing="1.4"
                    >
                      VIBE STEP
                    </text>

                    <text
                      x="18"
                      y="60"
                      fill="var(--text-primary)"
                      fontSize="14"
                      fontWeight="700"
                    >
                      {node.id}
                    </text>

                    <text x="18" y="84" fill="var(--text-muted)" fontSize="12">
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
