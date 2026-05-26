import {
  NODE_HEIGHT,
  type PositionedVibeGraph,
} from "@/lib/visual-vibes/layout/layoutTypes";
import {
  HORIZONTAL_LABEL_Y_OFFSET,
  SIDE_ROUTE_EPSILON,
  SIDE_ROUTE_LABEL_OFFSET,
  SIDE_ROUTE_OFFSET,
} from "./canvasConstants";
import { hashString } from "./canvasGraphUtils";

type PositionedEdge = PositionedVibeGraph["edges"][number];

export function getEdgeLabelPoint(edge: PositionedEdge) {
  if (isSideRoutedVerticalEdge(edge)) {
    const direction = getSideRouteDirection(edge);

    return {
      x: getSideRouteBendX(edge) + direction * SIDE_ROUTE_LABEL_OFFSET,
      y: (edge.sourceY + edge.targetY) / 2,
    };
  }

  const isMostlyHorizontal =
    Math.abs(edge.sourceY - edge.targetY) <= SIDE_ROUTE_EPSILON;
  const isMostlyVertical =
    Math.abs(edge.sourceX - edge.targetX) <= SIDE_ROUTE_EPSILON;

  if (isMostlyVertical) {
    const labelYOffset = clampMagnitude(edge.targetY - edge.sourceY, 42, 88);

    return {
      x: edge.sourceX + 42,
      y: edge.sourceY + labelYOffset,
    };
  }

  if (isMostlyHorizontal) {
    const labelXOffset = clampMagnitude(edge.targetX - edge.sourceX, 64, 150);

    return {
      x: edge.sourceX + labelXOffset,
      y: edge.sourceY - HORIZONTAL_LABEL_Y_OFFSET,
    };
  }

  return {
    x: edge.sourceX + clampMagnitude(edge.targetX - edge.sourceX, 56, 132),
    y: edge.sourceY + clampMagnitude(edge.targetY - edge.sourceY, 32, 86),
  };
}

export function getEdgePath(edge: PositionedEdge) {
  if (isSideRoutedVerticalEdge(edge)) {
    const bendX = getSideRouteBendX(edge);

    return `M ${edge.sourceX} ${edge.sourceY} L ${bendX} ${edge.sourceY} L ${bendX} ${edge.targetY} L ${edge.targetX} ${edge.targetY}`;
  }

  if (edge.type === "error") {
    const verticalMidY = edge.sourceY + (edge.targetY - edge.sourceY) * 0.5;

    return `M ${edge.sourceX} ${edge.sourceY} L ${edge.sourceX} ${verticalMidY} L ${edge.targetX} ${verticalMidY} L ${edge.targetX} ${edge.targetY}`;
  }

  const isMostlyVertical =
    Math.abs(edge.sourceX - edge.targetX) <= SIDE_ROUTE_EPSILON;

  if (isMostlyVertical) {
    const verticalMidY = edge.sourceY + (edge.targetY - edge.sourceY) * 0.5;

    return `M ${edge.sourceX} ${edge.sourceY} L ${edge.sourceX} ${verticalMidY} L ${edge.targetX} ${verticalMidY} L ${edge.targetX} ${edge.targetY}`;
  }

  const horizontalMidX = edge.sourceX + (edge.targetX - edge.sourceX) * 0.5;

  return `M ${edge.sourceX} ${edge.sourceY} L ${horizontalMidX} ${edge.sourceY} L ${horizontalMidX} ${edge.targetY} L ${edge.targetX} ${edge.targetY}`;
}

export function getEdgeStroke(edge: PositionedEdge, isTerminalError: boolean) {
  if (isTerminalError) {
    return "var(--danger)";
  }

  if (edge.type === "error") {
    return "#f59e0b";
  }

  if (edge.type === "next" || edge.type === "semantic") {
    return "var(--brand-primary)";
  }

  return "var(--edge-color)";
}

export function getEdgeMarkerEnd(
  edge: PositionedEdge,
  isTerminalError: boolean,
) {
  if (isTerminalError) {
    return "url(#arrow-terminal-error)";
  }

  if (edge.type === "error") {
    return "url(#arrow-error)";
  }

  if (edge.type === "next" || edge.type === "semantic") {
    return "url(#arrow-next)";
  }

  return "url(#arrow-data)";
}

export function getEdgeStrokeDasharray(
  edge: PositionedEdge,
  isTerminalError: boolean,
) {
  if (isTerminalError || edge.type === "error") {
    return "7 5";
  }

  if (edge.type === "data") {
    return "3 5";
  }

  if (edge.type === "semantic") {
    return "6 4";
  }

  return undefined;
}

export function getEdgeLabelFill(
  edge: PositionedEdge,
  isTerminalError: boolean,
) {
  if (isTerminalError) {
    return "var(--danger)";
  }

  if (edge.type === "error") {
    return "#b45309";
  }

  if (edge.type === "next" || edge.type === "semantic") {
    return "var(--brand-primary)";
  }

  return "var(--edge-color)";
}

function isSideRoutedVerticalEdge(edge: PositionedEdge) {
  return (
    Math.abs(edge.sourceX - edge.targetX) <= SIDE_ROUTE_EPSILON &&
    Math.abs(edge.sourceY - edge.targetY) > NODE_HEIGHT / 2
  );
}

function getSideRouteDirection(edge: PositionedEdge) {
  return edge.type === "error" ? -1 : 1;
}

function getSideRouteLaneOffset(edge: PositionedEdge) {
  if (!isSideRoutedVerticalEdge(edge)) {
    return 0;
  }

  const laneOffsets = [-28, 0, 28, -56, 56];
  const hash = hashString(`${edge.type}:${edge.source}:${edge.target}`);

  return laneOffsets[hash % laneOffsets.length];
}

function getSideRouteBendX(edge: PositionedEdge) {
  const direction = getSideRouteDirection(edge);
  const laneOffset = getSideRouteLaneOffset(edge);

  return edge.sourceX + direction * (SIDE_ROUTE_OFFSET + laneOffset);
}

function clampMagnitude(value: number, minMagnitude: number, maxMagnitude: number) {
  const direction = value < 0 ? -1 : 1;
  const magnitude = Math.min(
    maxMagnitude,
    Math.max(minMagnitude, Math.abs(value) * 0.32),
  );

  return direction * magnitude;
}
