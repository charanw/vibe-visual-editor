import assert from "node:assert/strict";
import test from "node:test";
import { visualVibeToGraph } from "../graph/buildGraph";
import type { VisualVibe } from "../schema";

test("visualVibeToGraph creates next, error, and data edges", () => {
  const vibe: VisualVibe = {
    workflow: {
      id: "customer_lookup",
      name: "Customer Lookup",
      description: "",
      steps: [
        {
          id: "load_profile",
          function: "apiRequest",
          input: {},
          next_step_id: "summarize_profile",
          on_error_step_id: "profile_error",
        },
        {
          id: "summarize_profile",
          function: "aiProcessing",
          input: {
            prompt: "Summarize ${steps.load_profile.output}",
          },
        },
        {
          id: "profile_error",
          function: "sendResponse",
          input: {},
        },
      ],
    },
  };

  const graph = visualVibeToGraph(vibe);

  assert.deepEqual(
    graph.nodes.map((node) => node.id),
    ["load_profile", "summarize_profile", "profile_error"],
  );

  // Sort before asserting because edge insertion order is not part of the graph
  // contract; source/target/type are the behavior this test cares about.
  const edgeSummaries = graph.edges
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
    }))
    .sort((a, b) =>
      `${a.source}:${a.target}:${a.type}`.localeCompare(
        `${b.source}:${b.target}:${b.type}`,
      ),
    );

  assert.deepEqual(
    edgeSummaries,
    [
      {
        source: "load_profile",
        target: "profile_error",
        type: "error",
      },
      {
        source: "load_profile",
        target: "summarize_profile",
        type: "data",
      },
      {
        source: "load_profile",
        target: "summarize_profile",
        type: "next",
      },
    ],
  );
});

test("visualVibeToGraph de-duplicates repeated data references", () => {
  const vibe: VisualVibe = {
    workflow: {
      id: "dedupe",
      name: "Dedupe",
      description: "",
      steps: [
        {
          id: "extract",
          function: "aiExtractVariables",
          input: {},
        },
        {
          id: "respond",
          function: "sendResponse",
          input: {
            first: "${steps.extract.name}",
            second: "${steps.extract.email}",
          },
        },
      ],
    },
  };

  const graph = visualVibeToGraph(vibe);

  assert.equal(graph.edges.length, 1);
  assert.deepEqual(graph.edges[0], {
    id: "extract-respond-data",
    source: "extract",
    target: "respond",
    type: "data",
  });
});

test("visualVibeToGraph enriches handleConditional branches", () => {
  const graph = visualVibeToGraph(
    createVibe([
      {
        id: "branch",
        function: "handleConditional",
        input: {
          condition: {
            if: "true",
            then: "happy_path",
            else: "fallback_path",
          },
        },
      },
      step("happy_path"),
      step("fallback_path"),
    ]),
  );

  const branch = graph.nodes.find((node) => node.id === "branch");
  const semanticEdges = graph.edges.filter(
    (edge) => edge.source === "branch" && edge.type === "semantic",
  );

  assert.deepEqual(branch?.semantic, {
    kind: "conditional",
    badge: "IF",
  });
  assert.deepEqual(
    semanticEdges.map((edge) => ({
      target: edge.target,
      label: edge.semantic?.label,
    })),
    [
      { target: "happy_path", label: "then" },
      { target: "fallback_path", label: "else" },
    ],
  );
});

test("visualVibeToGraph enriches loop edges without duplicating next edges", () => {
  const graph = visualVibeToGraph(
    createVibe([
      {
        id: "loop",
        function: "loopFlow",
        next_step_id: "after_loop",
        input: {
          items: "${steps.load.output}",
          steps: ["process_item"],
        },
      },
      step("process_item"),
      step("after_loop"),
    ]),
  );

  const loop = graph.nodes.find((node) => node.id === "loop");
  const eachEdge = graph.edges.find(
    (edge) => edge.source === "loop" && edge.target === "process_item",
  );
  const doneEdge = graph.edges.find(
    (edge) => edge.source === "loop" && edge.target === "after_loop",
  );

  assert.equal(loop?.semantic?.badge, "LOOP");
  assert.equal(eachEdge?.type, "semantic");
  assert.equal(eachEdge?.semantic?.label, "each");
  assert.equal(doneEdge?.type, "next");
  assert.equal(doneEdge?.semantic?.label, "done");
  assert.equal(
    graph.edges.filter(
      (edge) => edge.source === "loop" && edge.target === "after_loop",
    ).length,
    1,
  );
});

test("visualVibeToGraph classifies invokeWorkflow and concludeWorkflow", () => {
  const graph = visualVibeToGraph(
    createVibe([
      {
        id: "invoke",
        function: "invokeWorkflow",
        next_step_id: "done",
        input: {
          workflow_id: "child_workflow",
        },
      },
      {
        id: "done",
        function: "concludeWorkflow",
        input: {},
      },
    ]),
  );

  const invoke = graph.nodes.find((node) => node.id === "invoke");
  const done = graph.nodes.find((node) => node.id === "done");
  const workflowEdge = graph.edges.find(
    (edge) => edge.source === "invoke" && edge.target === "done",
  );

  assert.equal(invoke?.semantic?.badge, "FLOW");
  assert.equal(done?.semantic?.badge, "END");
  assert.equal(workflowEdge?.type, "next");
  assert.equal(workflowEdge?.semantic?.label, "workflow");
});

test("visualVibeToGraph marks disconnected executable chains as parallel lanes", () => {
  const graph = visualVibeToGraph(
    createVibe([
      { ...step("first_a"), next_step_id: "second_a" },
      step("second_a"),
      { ...step("first_b"), next_step_id: "second_b" },
      step("second_b"),
    ]),
  );

  const laneSummary = graph.nodes.map((node) => ({
    id: node.id,
    lane: node.semantic?.parallelLaneLabel,
    isStart: node.semantic?.isParallelLaneStart,
  }));

  assert.deepEqual(laneSummary, [
    { id: "first_a", lane: "Path 1", isStart: true },
    { id: "second_a", lane: "Path 1", isStart: false },
    { id: "first_b", lane: "Path 2", isStart: true },
    { id: "second_b", lane: "Path 2", isStart: false },
  ]);
});

test("visualVibeToGraph does not use data references as sequential lane connections", () => {
  const graph = visualVibeToGraph(
    createVibe([
      step("producer"),
      {
        id: "consumer",
        function: "sendResponse",
        input: {
          message: "${steps.producer.output}",
        },
      },
    ]),
  );

  assert.equal(graph.edges[0]?.type, "data");
  assert.deepEqual(
    graph.nodes.map((node) => node.semantic?.parallelLaneLabel),
    ["Path 1", "Path 2"],
  );
});

test("visualVibeToGraph ignores malformed control-flow input", () => {
  assert.doesNotThrow(() => {
    const graph = visualVibeToGraph(
      createVibe([
        {
          id: "broken_branch",
          function: "handleConditional",
          input: {
            condition: "not an object",
            then: 42,
          },
        },
        {
          id: "broken_loop",
          function: "loopFlow",
          input: {
            steps: { id: "not an array" },
          },
        },
      ]),
    );

    assert.equal(
      graph.edges.some((edge) => edge.type === "semantic"),
      false,
    );
  });
});

function createVibe(steps: VisualVibe["workflow"]["steps"]): VisualVibe {
  return {
    workflow: {
      id: "test_workflow",
      name: "Test Workflow",
      description: "",
      steps,
    },
  };
}

function step(id: string): VisualVibe["workflow"]["steps"][number] {
  return {
    id,
    function: "setVariable",
    input: {},
  };
}
