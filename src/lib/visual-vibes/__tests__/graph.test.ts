import assert from "node:assert/strict";
import test from "node:test";
import { visualVibeToGraph } from "../graph";
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
