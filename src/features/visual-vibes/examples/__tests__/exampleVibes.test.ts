import assert from "node:assert/strict";
import test from "node:test";
import { getFlowGraph } from "../../components/editor/editorGraphFilters";
import { visualVibeToGraph } from "../../../../lib/visual-vibes/graph/buildGraph";
import { parseVisualVibeYaml } from "../../../../lib/visual-vibes/parser/parseYaml";
import { validateVisualVibeYaml } from "../../../../lib/visual-vibes/validation";
import { exampleVibes } from "../exampleVibes";

test("built-in example Vibes are valid starter YAML", () => {
  for (const example of exampleVibes) {
    const issues = validateVisualVibeYaml(example.yaml);

    assert.deepEqual(
      issues,
      [],
      `${example.name} should not render validation issues`,
    );
  }
});

test("customer intake example keeps terminal outcomes separate from enrichment lane", () => {
  const customerIntake = exampleVibes[0];
  const graph = visualVibeToGraph(parseVisualVibeYaml(customerIntake.yaml));

  assert.equal(
    graph.edges.some(
      (edge) =>
        edge.source === "intake_failed" &&
        edge.target === "enrich_source_context",
    ),
    false,
  );
  assert.equal(
    graph.edges.some(
      (edge) =>
        edge.source === "intake_done" && edge.target === "intake_failed",
    ),
    false,
  );
});

test("customer intake Flow View includes the looped primary path and enrichment path", () => {
  const customerIntake = exampleVibes[0];
  const graph = visualVibeToGraph(parseVisualVibeYaml(customerIntake.yaml));
  const flowGraph = getFlowGraph(graph);
  const flowNodeIds = new Set(flowGraph.nodes.map((node) => node.id));

  assert.equal(flowNodeIds.has("normalize_intake"), true);
  assert.equal(flowNodeIds.has("intake_quality_gate"), true);
  assert.equal(flowNodeIds.has("enrich_source_context"), true);
  assert.equal(flowNodeIds.has("enrichment_done"), true);
});
