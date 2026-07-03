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
  if (isDecisionBranchLabel(edge.semantic?.label)) {
    return getDecisionBranchLabelPoint(edge);
  }

  const routePoints = getRoutePoints(edge);

  if (routePoints.length > 2) {
    return getPolylineMidpoint(routePoints);
  }

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

function isDecisionBranchLabel(label: string | undefined) {
  if (!label) {
    return false;
  }

  const normalizedLabel = label.toLowerCase();

  return (
    normalizedLabel === "then" ||
    normalizedLabel === "else" ||
    normalizedLabel === "default" ||
    normalizedLabel.startsWith("case ")
  );
}

function getDecisionBranchLabelPoint(edge: PositionedEdge) {
  const verticalDelta = edge.targetY - edge.sourceY;
  const isUpperBranch = verticalDelta < -SIDE_ROUTE_EPSILON;
  const isLowerBranch = verticalDelta > SIDE_ROUTE_EPSILON;
  const yOffset = isUpperBranch ? -24 : isLowerBranch ? 24 : -20;
  const xOffset = clampMagnitude(edge.targetX - edge.sourceX, 58, 92);

  return {
    x: edge.sourceX + xOffset,
    y: edge.sourceY + yOffset,
  };
}

export function getEdgePath(edge: PositionedEdge) {
  const routePoints = getRoutePoints(edge);

  if (routePoints.length > 2) {
    const [startPoint, ...remainingPoints] = routePoints;

    return [
      `M ${startPoint.x} ${startPoint.y}`,
      ...remainingPoints.map((point) => `L ${point.x} ${point.y}`),
    ].join(" ");
  }

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

function getRoutePoints(edge: PositionedEdge) {
  return [
    { x: edge.sourceX, y: edge.sourceY },
    ...(edge.bendPoints ?? []),
    { x: edge.targetX, y: edge.targetY },
  ];
}

function getPolylineMidpoint(points: Array<{ x: number; y: number }>) {
  const segmentLengths = points.map((point, index) => {
    const nextPoint = points[index + 1];

    if (!nextPoint) {
      return 0;
    }

    return Math.hypot(nextPoint.x - point.x, nextPoint.y - point.y);
  });
  const totalLength = segmentLengths.reduce(
    (total, length) => total + length,
    0,
  );
  let walkedLength = 0;

  for (const [index, segmentLength] of segmentLengths.entries()) {
    const point = points[index];
    const nextPoint = points[index + 1];

    if (!nextPoint) {
      break;
    }

    if (walkedLength + segmentLength >= totalLength / 2) {
      const segmentProgress =
        segmentLength === 0 ? 0 : (totalLength / 2 - walkedLength) / segmentLength;

      return {
        x: point.x + (nextPoint.x - point.x) * segmentProgress,
        y: point.y + (nextPoint.y - point.y) * segmentProgress,
      };
    }

    walkedLength += segmentLength;
  }

  return points[Math.floor(points.length / 2)] ?? { x: 0, y: 0 };
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
