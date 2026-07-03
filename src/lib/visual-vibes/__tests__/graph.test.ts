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
      {
        source: "summarize_profile",
        target: "profile_error",
        type: "next",
      },
    ],
  );

  const inferredEdge = graph.edges.find(
    (edge) =>
      edge.source === "summarize_profile" && edge.target === "profile_error",
  );

  assert.equal(inferredEdge?.inferred, true);
});

test("visualVibeToGraph de-duplicates repeated data references while preserving sequence", () => {
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

  const dataEdges = graph.edges.filter((edge) => edge.type === "data");
  const nextEdges = graph.edges.filter((edge) => edge.type === "next");

  assert.equal(dataEdges.length, 1);
  assert.deepEqual(dataEdges[0], {
    id: "extract-respond-data",
    source: "extract",
    target: "respond",
    type: "data",
  });
  assert.deepEqual(nextEdges, [
    {
      id: "extract-respond-next",
      source: "extract",
      target: "respond",
      type: "next",
      inferred: true,
    },
  ]);
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
    (edge) => edge.source === "branch" && edge.semantic?.label,
  );

  assert.equal(branch?.semantic?.kind, "conditional");
  assert.equal(branch?.semantic?.badge, "IF");
  assert.deepEqual(branch?.semantic?.outputPreview, []);
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

test("visualVibeToGraph enriches handleConditional switch cases", () => {
  const graph = visualVibeToGraph(
    createVibe([
      {
        id: "route_status",
        function: "handleConditional",
        input: {
          condition: {
            type: "switch",
            expression: "${steps.lookup.output.status}",
            cases: [
              { value: "open", stepId: "handle_open" },
              { type: "pattern", pattern: "^ERR-", stepId: "handle_error" },
            ],
          },
        },
      },
      step("handle_open"),
      step("handle_error"),
    ]),
  );

  const branch = graph.nodes.find((node) => node.id === "route_status");
  const semanticEdges = graph.edges.filter(
    (edge) => edge.source === "route_status" && edge.semantic?.label,
  );

  assert.equal(branch?.semantic?.kind, "conditional");
  assert.equal(branch?.semantic?.conditionMode, "switch");
  assert.deepEqual(
    semanticEdges.map((edge) => ({
      target: edge.target,
      label: edge.semantic?.label,
    })),
    [
      { target: "handle_open", label: "case open" },
      { target: "handle_error", label: "pattern" },
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
  assert.equal(loop?.semantic?.loopItemsPreview, "load result");
  assert.deepEqual(loop?.semantic?.loopStepIds, ["process_item"]);
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

test("visualVibeToGraph renders nested loopFlow steps", () => {
  const graph = visualVibeToGraph(
    createVibe([
      {
        id: "process_orders",
        function: "loopFlow",
        next_step_id: "done",
        input: {
          iterable: "${steps.fetch_orders.output.orders}",
          steps: [
            {
              id: "enrich_order",
              function: "apiRequest",
              input: {
                endpoint: "https://api.example.com/orders/${currentElement.id}",
              },
            },
            {
              id: "notify_customer",
              function: "sendEmail",
              input: {
                to: "${currentElement.customer_email}",
              },
            },
          ],
        },
      },
      step("done"),
    ]),
  );

  const loop = graph.nodes.find((node) => node.id === "process_orders");
  const enrich = graph.nodes.find(
    (node) => node.id === "process_orders.enrich_order",
  );
  const notify = graph.nodes.find(
    (node) => node.id === "process_orders.notify_customer",
  );

  assert.equal(loop?.semantic?.loopItemsPreview, "fetch orders orders");
  assert.deepEqual(loop?.semantic?.loopStepIds, [
    "enrich_order",
    "notify_customer",
  ]);
  assert.equal(enrich?.semantic?.kind, "loopStep");
  assert.equal(enrich?.semantic?.badge, "EACH");
  assert.equal(notify?.semantic?.loopParentId, "process_orders");
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.source === "process_orders" &&
        edge.target === "process_orders.enrich_order" &&
        edge.semantic?.label === "each",
    ),
  );
  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.source === "process_orders.enrich_order" &&
        edge.target === "process_orders.notify_customer" &&
        edge.semantic?.label === "next",
    ),
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

test("visualVibeToGraph does not infer fallthrough after concludeWorkflow", () => {
  const graph = visualVibeToGraph(
    createVibe([
      {
        id: "done",
        function: "concludeWorkflow",
        input: {},
      },
      step("parallel_lane"),
    ]),
  );

  assert.equal(
    graph.edges.some(
      (edge) => edge.source === "done" && edge.target === "parallel_lane",
    ),
    false,
  );
  assert.equal(graph.nodes.find((node) => node.id === "done")?.semantic?.badge, "END");
});

test("visualVibeToGraph uses YAML order as the default executable lane", () => {
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
    { id: "first_a", lane: undefined, isStart: undefined },
    { id: "second_a", lane: undefined, isStart: undefined },
    { id: "first_b", lane: undefined, isStart: undefined },
    { id: "second_b", lane: undefined, isStart: undefined },
  ]);

  assert.ok(
    graph.edges.some(
      (edge) =>
        edge.source === "second_a" &&
        edge.target === "first_b" &&
        edge.type === "next" &&
        edge.inferred,
    ),
  );
});

test("visualVibeToGraph uses YAML order, not data references, for sequential fallback", () => {
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

  const dataEdge = graph.edges.find((edge) => edge.type === "data");
  const nextEdge = graph.edges.find((edge) => edge.type === "next");

  assert.deepEqual(dataEdge, {
    id: "producer-consumer-data",
    source: "producer",
    target: "consumer",
    type: "data",
  });
  assert.deepEqual(nextEdge, {
    id: "producer-consumer-next",
    source: "producer",
    target: "consumer",
    type: "next",
    inferred: true,
  });
  assert.deepEqual(
    graph.nodes.map((node) => node.semantic?.parallelLaneLabel),
    [undefined, undefined],
  );
});

test("visualVibeToGraph treats null next_step_id as no fallthrough", () => {
  const graph = visualVibeToGraph(
    createVibe([
      { ...step("producer"), next_step_id: null },
      step("consumer"),
    ]),
  );

  assert.equal(
    graph.edges.some(
      (edge) =>
        edge.source === "producer" &&
        edge.target === "consumer" &&
        edge.type === "next",
    ),
    false,
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
