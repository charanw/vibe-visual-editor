import type { VibeGraph, VibeGraphEdge } from "./graph";

export type PositionedVibeNode = {
  id: string;
  functionName: string;
  x: number;
  y: number;
};

export type PositionedVibeEdge = {
  id: string;
  source: string;
  target: string;
  type: VibeGraphEdge["type"];
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
};

export type PositionedVibeGraph = {
  nodes: PositionedVibeNode[];
  edges: PositionedVibeEdge[];
};

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 110;

const COLUMN_GAP = 140;
const ROW_GAP = 80;
const START_X = 80;
const START_Y = 100;
const BAND_GAP = 120;

export function layoutVibeGraph(
  graph: VibeGraph,
  availableWidth = 1000,
): PositionedVibeGraph {
  const incomingByNode = new Map<string, string[]>();

  for (const node of graph.nodes) {
    incomingByNode.set(node.id, []);
  }

  for (const edge of graph.edges) {
    incomingByNode.get(edge.target)?.push(edge.source);
  }

  const depthByNode = new Map<string, number>();

  function getDepth(nodeId: string, visiting = new Set<string>()): number {
    if (depthByNode.has(nodeId)) {
      return depthByNode.get(nodeId)!;
    }

    if (visiting.has(nodeId)) {
      return 0;
    }

    visiting.add(nodeId);

    const incoming = incomingByNode.get(nodeId) ?? [];

    if (incoming.length === 0) {
      depthByNode.set(nodeId, 0);
      return 0;
    }

    const depth = Math.max(
      ...incoming.map((sourceId) => getDepth(sourceId, visiting) + 1),
    );

    depthByNode.set(nodeId, depth);
    return depth;
  }

  for (const node of graph.nodes) {
    getDepth(node.id);
  }

  const nodesByDepth = new Map<number, typeof graph.nodes>();

  for (const node of graph.nodes) {
    const depth = depthByNode.get(node.id) ?? 0;
    const existing = nodesByDepth.get(depth) ?? [];

    existing.push(node);
    nodesByDepth.set(depth, existing);
  }

  const sortedDepths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);

  const maxNodesInAnyDepth = Math.max(
    1,
    ...Array.from(nodesByDepth.values()).map((nodes) => nodes.length),
  );

  const bandHeight =
    maxNodesInAnyDepth * (NODE_HEIGHT + ROW_GAP) + BAND_GAP;

  const usableWidth = Math.max(availableWidth - START_X * 2, NODE_WIDTH);

  const maxColumns = Math.max(
    1,
    Math.floor((usableWidth + COLUMN_GAP) / (NODE_WIDTH + COLUMN_GAP)),
  );

  const positionedNodes: PositionedVibeNode[] = [];

  for (const depth of sortedDepths) {
    const nodesAtDepth = nodesByDepth.get(depth) ?? [];

    const wrappedColumn = depth % maxColumns;
    const bandIndex = Math.floor(depth / maxColumns);

    nodesAtDepth.forEach((node, rowIndex) => {
      positionedNodes.push({
        id: node.id,
        functionName: node.functionName,
        x: START_X + wrappedColumn * (NODE_WIDTH + COLUMN_GAP),
        y:
          START_Y +
          bandIndex * bandHeight +
          rowIndex * (NODE_HEIGHT + ROW_GAP),
      });
    });
  }

  const nodeById = new Map(positionedNodes.map((node) => [node.id, node]));

  const positionedEdges: PositionedVibeEdge[] = graph.edges.flatMap((edge) => {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);

    if (!source || !target) {
      return [];
    }

    return [
      {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        sourceX: source.x + NODE_WIDTH,
        sourceY: source.y + NODE_HEIGHT / 2,
        targetX: target.x,
        targetY: target.y + NODE_HEIGHT / 2,
      },
    ];
  });

  return {
    nodes: positionedNodes,
    edges: positionedEdges,
  };
}