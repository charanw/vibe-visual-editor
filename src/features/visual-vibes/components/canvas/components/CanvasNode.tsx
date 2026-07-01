import type { MouseEvent as ReactMouseEvent } from "react";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout/layoutTypes";
import type { AddEdgeOptions } from "../../../types";
import {
  ConclusionBadge,
  NodeActionButton,
  SemanticNodeBadge,
  StartingFlagBadge,
} from "./CanvasBadges";
import { EditableConditionLabel } from "./EditableConditionLabel";
import type { CanvasNodeState } from "../hooks/useCanvasNodeClassifier";

type CanvasNodeProps = {
  node: PositionedVibeGraph["nodes"][number];
  state: CanvasNodeState;
  isEditing: boolean;
  isHovered: boolean;
  connectingFromStepId: string | null;
  onHoverStart: (nodeId: string) => void;
  onHoverEnd: () => void;
  onSelectStep: (stepId: string) => void;
  onDeleteStep: (stepId: string) => void;
  onStartConnecting: (stepId: string) => void;
  onAddEdge: (options: AddEdgeOptions) => void;
  onUpdateCondition: (stepId: string, expression: string) => void;
  onClearConnectingStep: () => void;
  onAppendStepAfter: (sourceStepId: string) => void;
  onPrependStepBefore: (targetStepId: string) => void;
};

/** Renders one workflow node and its edit/link affordances. */
export function CanvasNode({
  node,
  state,
  isEditing,
  isHovered,
  connectingFromStepId,
  onHoverStart,
  onHoverEnd,
  onSelectStep,
  onDeleteStep,
  onStartConnecting,
  onAddEdge,
  onUpdateCondition,
  onClearConnectingStep,
  onAppendStepAfter,
  onPrependStepBefore,
}: CanvasNodeProps) {
  const statusBadgeX = node.semantic?.badge ? NODE_WIDTH - 82 : NODE_WIDTH - 30;
  const inputPreview = node.semantic?.inputPreview ?? [];
  const outputPreview = node.semantic?.outputPreview ?? [];
  const loopStepIds = node.semantic?.loopStepIds ?? [];
  const hoverHeight =
    node.semantic?.kind === "loop" ? NODE_HEIGHT + 142 : NODE_HEIGHT + 82;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={() => onHoverStart(node.id)}
      onMouseLeave={onHoverEnd}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={() => onSelectStep(node.id)}
      className="cursor-pointer"
      opacity={state.isDimmed ? "0.14" : "1"}
    >
      <rect
        x="-34"
        y="-14"
        width={NODE_WIDTH + 68}
        height={hoverHeight}
        rx="24"
        fill="transparent"
      />

      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx="16"
        fill={state.colors.fill}
        stroke={state.colors.stroke}
        strokeWidth={state.colors.strokeWidth}
      />

      {node.semantic?.isParallelLaneStart &&
        node.semantic.parallelLaneLabel && (
          <text
            x="0"
            y="-24"
            fill="var(--text-muted)"
            fontSize="11"
            fontWeight="800"
            letterSpacing="1.2"
            pointerEvents="none"
          >
            {node.semantic.parallelLaneLabel}
          </text>
        )}

      {node.semantic?.badge && (
        <SemanticNodeBadge
          x={NODE_WIDTH - 10}
          y={10}
          label={node.semantic.badge}
        />
      )}

      {state.isConclusion && !node.semantic?.badge && (
        <ConclusionBadge x={statusBadgeX} y={26} />
      )}
      {state.isStartingFlowNode && (
        <StartingFlagBadge x={statusBadgeX} y={26} />
      )}

      {isEditing && isHovered && (
        <>
          <DeleteNodeButton onClick={() => onDeleteStep(node.id)} />

          <NodeActionButton
            x={6}
            y={NODE_HEIGHT + 18}
            label="+ Before"
            onClick={(event) => {
              event.stopPropagation();
              onPrependStepBefore(node.id);
            }}
          />

          <NodeActionButton
            x={112}
            y={NODE_HEIGHT + 18}
            label="+ After"
            onClick={(event) => {
              event.stopPropagation();
              onAppendStepAfter(node.id);
            }}
          />
        </>
      )}

      {isEditing && isHovered && (
        <>
          <LinkHandle
            side="out"
            isActive
            onClick={(event) => {
              event.stopPropagation();
              onStartConnecting(node.id);
            }}
          />

          <LinkHandle
            side="in"
            isActive={Boolean(
              connectingFromStepId && connectingFromStepId !== node.id,
            )}
            onClick={(event) => {
              event.stopPropagation();

              if (!connectingFromStepId || connectingFromStepId === node.id) {
                return;
              }

              onAddEdge({
                sourceStepId: connectingFromStepId,
                targetStepId: node.id,
              });

              onClearConnectingStep();
            }}
          />
        </>
      )}

      <text
        x="18"
        y="34"
        fill={state.colors.labelFill}
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.4"
        pointerEvents="none"
      >
        {state.label}
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
        y={node.semantic?.kind === "conditional" ? "76" : "78"}
        fill="var(--text-muted)"
        fontSize="12"
        pointerEvents="none"
      >
        {node.functionName}
      </text>

      {node.semantic?.kind === "conditional" && (
        <EditableConditionLabel
          stepId={node.id}
          expression={node.semantic.conditionExpression}
          isEditing={isEditing}
          onUpdateCondition={onUpdateCondition}
        />
      )}

      <PreviewSection
        x={18}
        y={node.semantic?.kind === "conditional" ? 88 : 88}
        label="IN"
        items={inputPreview}
        accent="var(--brand-primary)"
      />

      <PreviewSection
        x={118}
        y={88}
        label="OUT"
        items={outputPreview}
        accent="#22c55e"
      />

      {node.semantic?.kind === "loop" && (
        <LoopSubnodes
          loopItemsPreview={node.semantic.loopItemsPreview}
          loopStepIds={loopStepIds}
        />
      )}
    </g>
  );
}

function PreviewSection({
  x,
  y,
  label,
  items,
  accent,
}: {
  x: number;
  y: number;
  label: string;
  items: string[];
  accent: string;
}) {
  const visibleItems = items.slice(0, 2);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <g pointerEvents="none">
      <text
        x={x}
        y={y}
        fill={accent}
        fontSize="8"
        fontWeight="800"
        letterSpacing="1.1"
      >
        {label}
      </text>
      {visibleItems.map((item, index) => (
        <text
          key={`${label}-${item}-${index}`}
          x={x}
          y={y + 12 + index * 10}
          fill="var(--text-muted)"
          fontSize="8.5"
        >
          {item}
        </text>
      ))}
    </g>
  );
}

function LoopSubnodes({
  loopItemsPreview,
  loopStepIds,
}: {
  loopItemsPreview?: string;
  loopStepIds: string[];
}) {
  if (loopStepIds.length === 0) {
    return null;
  }

  const visibleStepIds = loopStepIds.slice(0, 3);
  const startX = 16;
  const startY = NODE_HEIGHT + 42;
  const cardWidth = 104;
  const cardHeight = 40;
  const gap = 12;
  const returnY = startY + cardHeight + 22;
  const returnStartX = startX + (visibleStepIds.length - 1) * (cardWidth + gap) + cardWidth;

  return (
    <g pointerEvents="none">
      <text
        x={startX}
        y={NODE_HEIGHT + 24}
        fill="var(--brand-primary)"
        fontSize="9"
        fontWeight="800"
        letterSpacing="1.2"
      >
        LOOP ITEMS {loopItemsPreview ? `· ${loopItemsPreview}` : ""}
      </text>

      {visibleStepIds.map((stepId, index) => {
        const x = startX + index * (cardWidth + gap);

        return (
          <g key={stepId} transform={`translate(${x}, ${startY})`}>
            <rect
              width={cardWidth}
              height={cardHeight}
              rx="10"
              fill="rgba(14, 165, 233, 0.08)"
              stroke="var(--brand-primary)"
              strokeWidth="1.4"
              strokeDasharray="4 4"
            />
            <text
              x="10"
              y="17"
              fill="var(--brand-primary)"
              fontSize="8"
              fontWeight="800"
              letterSpacing="1"
            >
              EACH
            </text>
            <text
              x="10"
              y="31"
              fill="var(--text-primary)"
              fontSize="10"
              fontWeight="700"
            >
              {stepId}
            </text>
          </g>
        );
      })}

      {visibleStepIds.length > 1 && (
        <path
          d={`M ${startX + cardWidth} ${startY + cardHeight / 2} H ${returnStartX - cardWidth - gap}`}
          fill="none"
          stroke="var(--brand-primary)"
          strokeWidth="1.4"
          strokeDasharray="4 4"
        />
      )}

      <path
        d={`M ${returnStartX} ${startY + cardHeight / 2} V ${returnY} H ${startX - 8} V ${startY + cardHeight / 2}`}
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="1.4"
        strokeDasharray="4 4"
      />
      <path
        d={`M ${startX - 8} ${startY + cardHeight / 2} l5 -5 m-5 5 l5 5`}
        fill="none"
        stroke="var(--brand-primary)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </g>
  );
}

function DeleteNodeButton({ onClick }: { onClick: () => void }) {
  return (
    <g
      transform={`translate(${NODE_WIDTH - 18}, 18)`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
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
        x
      </text>
    </g>
  );
}

type LinkHandleProps = {
  side: "in" | "out";
  isActive: boolean;
  onClick: (event: ReactMouseEvent<SVGGElement>) => void;
};

function LinkHandle({ side, isActive, onClick }: LinkHandleProps) {
  const isOutgoing = side === "out";
  const x = isOutgoing ? NODE_WIDTH + 10 : -10;
  const fill = isOutgoing
    ? "var(--panel-bg)"
    : isActive
      ? "var(--brand-soft)"
      : "var(--panel-bg)";
  const stroke = isOutgoing
    ? "var(--brand-primary)"
    : isActive
      ? "var(--brand-primary)"
      : "var(--border-subtle)";
  const pathStroke = isOutgoing
    ? "var(--brand-primary)"
    : isActive
      ? "var(--brand-primary)"
      : "var(--text-muted)";
  const path = isOutgoing
    ? "M-4 0h8M2 -4l4 4-4 4"
    : "M-4 0h8M-2 -4l-4 4 4 4";

  return (
    <g
      transform={`translate(${x}, ${NODE_HEIGHT / 2})`}
      onClick={onClick}
      className={
        isOutgoing || isActive ? "cursor-crosshair" : "cursor-not-allowed"
      }
    >
      <circle r="10" fill={fill} stroke={stroke} strokeWidth="2" />
      <path
        d={path}
        fill="none"
        stroke={pathStroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        pointerEvents="none"
      />
    </g>
  );
}
