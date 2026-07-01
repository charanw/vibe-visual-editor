import assert from "node:assert/strict";
import test from "node:test";
import { layoutVibeGraph } from "../layout/layoutGraph";
import { NODE_HEIGHT, NODE_WIDTH } from "../layout/layoutTypes";
import type { VibeGraph } from "../graph/graphTypes";

test("layoutVibeGraph places left-to-right flow nodes in ELK layers", async () => {
  const positionedGraph = await layoutVibeGraph(createLinearGraph(6), {
    direction: "LR",
  });
  const step1 = getNode(positionedGraph, "step_1");
  const step2 = getNode(positionedGraph, "step_2");
  const step3 = getNode(positionedGraph, "step_3");
  const firstEdge = positionedGraph.edges.find(
    (edge) => edge.source === "step_1" && edge.target === "step_2",
  );

  assert.ok(step2.x > step1.x);
  assert.ok(step3.x > step2.x);
  assert.ok(firstEdge);
  assert.ok(firstEdge.targetX > firstEdge.sourceX);
  assertNoNodeOverlaps(positionedGraph);
});

test("layoutVibeGraph places top-to-bottom flow nodes in ELK layers", async () => {
  const positionedGraph = await layoutVibeGraph(createLinearGraph(6), {
    direction: "TB",
  });
  const step1 = getNode(positionedGraph, "step_1");
  const step2 = getNode(positionedGraph, "step_2");
  const step3 = getNode(positionedGraph, "step_3");
  const firstEdge = positionedGraph.edges.find(
    (edge) => edge.source === "step_1" && edge.target === "step_2",
  );

  assert.ok(step2.y > step1.y);
  assert.ok(step3.y > step2.y);
  assert.ok(firstEdge);
  assert.ok(firstEdge.targetY > firstEdge.sourceY);
  assertNoNodeOverlaps(positionedGraph);
});

test("layoutVibeGraph defaults to horizontal desktop-style layers", async () => {
  const graph = createLinearGraph(6);

  const defaultGraph = await layoutVibeGraph(graph);
  const explicitHorizontalGraph = await layoutVibeGraph(graph, {
    direction: "LR",
  });
  const defaultStep2 = getNode(defaultGraph, "step_2");
  const horizontalStep2 = getNode(explicitHorizontalGraph, "step_2");

  assert.deepEqual(
    { x: defaultStep2.x, y: defaultStep2.y },
    { x: horizontalStep2.x, y: horizontalStep2.y },
  );
});

test("layoutVibeGraph can still choose a compact readable orientation when requested", async () => {
  const graph = createLinearGraph(6);

  const automaticGraph = await layoutVibeGraph(graph, { direction: "auto" });
  const leftToRightGraph = await layoutVibeGraph(graph, { direction: "LR" });
  const automaticBounds = measurePositionedGraph(automaticGraph);
  const leftToRightBounds = measurePositionedGraph(leftToRightGraph);
  const step1 = getNode(automaticGraph, "step_1");
  const step6 = getNode(automaticGraph, "step_6");

  assert.ok(
    Math.max(automaticBounds.width, automaticBounds.height) <=
      Math.max(leftToRightBounds.width, leftToRightBounds.height),
  );
  assert.notDeepEqual(
    { x: step1.x, y: step1.y },
    { x: step6.x, y: step6.y },
  );
});

test("layoutVibeGraph places error view chains in readable ELK components", async () => {
  const graph: VibeGraph = {
    nodes: [
      { id: "source_a", functionName: "apiRequest", kind: "step" },
      { id: "error_a", functionName: "sendResponse", kind: "step" },
      { id: "source_b", functionName: "apiRequest", kind: "step" },
      { id: "error_b", functionName: "sendResponse", kind: "step" },
    ],
    edges: [
      {
        id: "source_a-error_a-error",
        source: "source_a",
        target: "error_a",
        type: "error",
      },
      {
        id: "source_b-error_b-error",
        source: "source_b",
        target: "error_b",
        type: "error",
      },
    ],
  };

  const positionedGraph = await layoutVibeGraph(graph, {
    mode: "errors",
    direction: "TB",
  });
  const sourceA = getNode(positionedGraph, "source_a");
  const errorA = getNode(positionedGraph, "error_a");
  const sourceB = getNode(positionedGraph, "source_b");

  assert.ok(errorA.y > sourceA.y);
  assert.ok(sourceB.x > sourceA.x);
  assertNoNodeOverlaps(positionedGraph);
});

test("layoutVibeGraph separates conditional branches in both directions", async () => {
  const graph: VibeGraph = {
    nodes: [
      {
        id: "branch",
        functionName: "handleConditional",
        kind: "step",
        semantic: { kind: "conditional", badge: "IF" },
      },
      { id: "then_step", functionName: "sendEmail", kind: "step" },
      { id: "else_step", functionName: "sendEmail", kind: "step" },
    ],
    edges: [
      {
        id: "branch-then_step-semantic-then",
        source: "branch",
        target: "then_step",
        type: "semantic",
        semantic: { label: "then" },
      },
      {
        id: "branch-else_step-semantic-else",
        source: "branch",
        target: "else_step",
        type: "semantic",
        semantic: { label: "else" },
      },
    ],
  };

  const leftToRight = await layoutVibeGraph(graph, { direction: "LR" });
  const lrThen = leftToRight.nodes.find((node) => node.id === "then_step");
  const lrElse = leftToRight.nodes.find((node) => node.id === "else_step");

  assert.equal(lrThen?.x, lrElse?.x);
  assert.notEqual(lrThen?.y, lrElse?.y);

  const topToBottom = await layoutVibeGraph(graph, { direction: "TB" });
  const tbThen = topToBottom.nodes.find((node) => node.id === "then_step");
  const tbElse = topToBottom.nodes.find((node) => node.id === "else_step");

  assert.equal(tbThen?.y, tbElse?.y);
  assert.notEqual(tbThen?.x, tbElse?.x);
});

function getNode(
  graph: Awaited<ReturnType<typeof layoutVibeGraph>>,
  nodeId: string,
) {
  const node = graph.nodes.find((currentNode) => currentNode.id === nodeId);

  assert.ok(node, `Expected node "${nodeId}" to be positioned.`);

  return node;
}

function createLinearGraph(nodeCount: number): VibeGraph {
  return {
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      id: `step_${index + 1}`,
      functionName: "setVariable",
      kind: "step",
    })),
    edges: Array.from({ length: nodeCount - 1 }, (_, index) => ({
      id: `step_${index + 1}-step_${index + 2}-next`,
      source: `step_${index + 1}`,
      target: `step_${index + 2}`,
      type: "next",
    })),
  };
}

function measurePositionedGraph(
  graph: Awaited<ReturnType<typeof layoutVibeGraph>>,
) {
  const minX = Math.min(...graph.nodes.map((node) => node.x));
  const maxX = Math.max(...graph.nodes.map((node) => node.x + NODE_WIDTH));
  const minY = Math.min(...graph.nodes.map((node) => node.y));
  const maxY = Math.max(...graph.nodes.map((node) => node.y + NODE_HEIGHT));

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}

function assertNoNodeOverlaps(
  graph: Awaited<ReturnType<typeof layoutVibeGraph>>,
) {
  for (const [index, node] of graph.nodes.entries()) {
    for (const otherNode of graph.nodes.slice(index + 1)) {
      const overlapsHorizontally =
        node.x < otherNode.x + NODE_WIDTH && node.x + NODE_WIDTH > otherNode.x;
      const overlapsVertically =
        node.y < otherNode.y + NODE_HEIGHT && node.y + NODE_HEIGHT > otherNode.y;

      assert.equal(
        overlapsHorizontally && overlapsVertically,
        false,
        `Expected "${node.id}" and "${otherNode.id}" not to overlap.`,
      );
    }
  }
}
