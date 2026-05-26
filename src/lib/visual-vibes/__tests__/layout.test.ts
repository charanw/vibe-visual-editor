import assert from "node:assert/strict";
import test from "node:test";
import { layoutVibeGraph } from "../layout/layoutGraph";
import { NODE_HEIGHT, NODE_WIDTH } from "../layout/layoutTypes";
import type { VibeGraph } from "../graph/graphTypes";

test("layoutVibeGraph places left-to-right flow nodes by execution rank", () => {
  const graph: VibeGraph = {
    nodes: Array.from({ length: 6 }, (_, index) => ({
      id: `step_${index + 1}`,
      functionName: "setVariable",
      kind: "step",
    })),
    edges: Array.from({ length: 5 }, (_, index) => ({
      id: `step_${index + 1}-step_${index + 2}-next`,
      source: `step_${index + 1}`,
      target: `step_${index + 2}`,
      type: "next",
    })),
  };

  const positionedGraph = layoutVibeGraph(graph);
  const step1 = positionedGraph.nodes.find((node) => node.id === "step_1");
  const step5 = positionedGraph.nodes.find((node) => node.id === "step_5");

  assert.deepEqual(
    { x: step1?.x, y: step1?.y },
    { x: 80, y: 80 },
  );
  assert.equal(step5?.x, 80 + 4 * (NODE_WIDTH + 240));
  assert.equal(step5?.y, 80);
});

test("layoutVibeGraph places top-to-bottom flow nodes by execution rank", () => {
  const graph: VibeGraph = {
    nodes: Array.from({ length: 6 }, (_, index) => ({
      id: `step_${index + 1}`,
      functionName: "setVariable",
      kind: "step",
    })),
    edges: Array.from({ length: 5 }, (_, index) => ({
      id: `step_${index + 1}-step_${index + 2}-next`,
      source: `step_${index + 1}`,
      target: `step_${index + 2}`,
      type: "next",
    })),
  };

  const positionedGraph = layoutVibeGraph(graph, { direction: "TB" });
  const step1 = positionedGraph.nodes.find((node) => node.id === "step_1");
  const step5 = positionedGraph.nodes.find((node) => node.id === "step_5");

  assert.deepEqual(
    { x: step1?.x, y: step1?.y },
    { x: 80, y: 80 },
  );
  assert.equal(step5?.y, 80 + 4 * (NODE_HEIGHT + 165));
  assert.equal(step5?.x, 80);
});

test("layoutVibeGraph places error view chains in separate columns", () => {
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

  const positionedGraph = layoutVibeGraph(graph, {
    mode: "errors",
    direction: "TB",
  });
  const sourceA = positionedGraph.nodes.find((node) => node.id === "source_a");
  const errorA = positionedGraph.nodes.find((node) => node.id === "error_a");
  const sourceB = positionedGraph.nodes.find((node) => node.id === "source_b");

  assert.deepEqual(
    { x: sourceA?.x, y: sourceA?.y },
    { x: 80, y: 80 },
  );
  assert.deepEqual(
    { x: errorA?.x, y: errorA?.y },
    { x: 80, y: 80 + NODE_HEIGHT + 165 },
  );
  assert.equal(sourceB?.x, 80 + NODE_WIDTH + 188);
});

test("layoutVibeGraph separates conditional branches in both directions", () => {
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

  const leftToRight = layoutVibeGraph(graph, { direction: "LR" });
  const lrThen = leftToRight.nodes.find((node) => node.id === "then_step");
  const lrElse = leftToRight.nodes.find((node) => node.id === "else_step");

  assert.equal(lrThen?.x, lrElse?.x);
  assert.ok((lrElse?.y ?? 0) > (lrThen?.y ?? 0));

  const topToBottom = layoutVibeGraph(graph, { direction: "TB" });
  const tbThen = topToBottom.nodes.find((node) => node.id === "then_step");
  const tbElse = topToBottom.nodes.find((node) => node.id === "else_step");

  assert.equal(tbThen?.y, tbElse?.y);
  assert.ok((tbElse?.x ?? 0) > (tbThen?.x ?? 0));
});
