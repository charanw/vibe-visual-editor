import assert from "node:assert/strict";
import test from "node:test";
import {
  addStandaloneStepInYaml,
  addTemplateStepInYaml,
  deleteStepInYaml,
  getStepDescriptionFromYaml,
  getStepIdAtYamlLine,
  parseVisualVibeYaml,
  updateConditionalExpressionInYaml,
  updateStepDescriptionInYaml,
  updateVibeStepInYaml,
} from "../yaml";

// Models the common edit path: one step produces data, the next step consumes it
// through a `${steps.*}` expression, and the producer carries a comment-backed
// description that should survive YAML rewrites.
const exampleYaml = `
workflow:
  id: support_flow
  name: Support Flow
  description: Handles a support request.
  steps:
    # Load the customer profile before responding.
    - id: load_profile
      function: apiRequest
      input:
        endpoint: /customers/profile
      next_step_id: respond
    - id: respond
      function: sendResponse
      input:
        message: "Profile: \${steps.load_profile.output}"
`;

test("getStepDescriptionFromYaml reads comments directly above a step", () => {
  assert.equal(
    getStepDescriptionFromYaml(exampleYaml, "load_profile"),
    "Load the customer profile before responding.",
  );
});

test("getStepIdAtYamlLine maps editor cursor lines to workflow steps", () => {
  assert.equal(getStepIdAtYamlLine(exampleYaml, 8), "load_profile");
  assert.equal(getStepIdAtYamlLine(exampleYaml, 11), "load_profile");
  assert.equal(getStepIdAtYamlLine(exampleYaml, 13), "respond");
  assert.equal(getStepIdAtYamlLine(exampleYaml, 7), null);
});

test("updateStepDescriptionInYaml writes comment-backed descriptions", () => {
  const nextYaml = updateStepDescriptionInYaml(
    exampleYaml,
    "respond",
    "Send the final customer response.",
  );

  assert.equal(
    getStepDescriptionFromYaml(nextYaml, "respond"),
    "Send the final customer response.",
  );
  assert.match(nextYaml, /# Send the final customer response\.\n\s+- id: respond/);
});

test("updateVibeStepInYaml renames a step and rewrites references", () => {
  const nextYaml = updateVibeStepInYaml(exampleYaml, "load_profile", {
    id: "fetch_profile",
    functionName: "apiRequest",
    input: {
      endpoint: "/customers/profile",
    },
  });

  const vibe = parseVisualVibeYaml(nextYaml);
  const renamedStep = vibe.workflow.steps.find(
    (step) => step.id === "fetch_profile",
  );
  const responseStep = vibe.workflow.steps.find((step) => step.id === "respond");

  assert.ok(renamedStep);

  // Renaming a step must update interpolation references so data edges still
  // point at the same logical producer.
  assert.equal(
    responseStep?.input.message,
    "Profile: ${steps.fetch_profile.output}",
  );
  assert.equal(
    getStepDescriptionFromYaml(nextYaml, "fetch_profile"),
    "Load the customer profile before responding.",
  );
});

test("deleteStepInYaml bridges next_step_id and removes data references", () => {
  const nextYaml = deleteStepInYaml(exampleYaml, "load_profile");
  const vibe = parseVisualVibeYaml(nextYaml);

  // Deleting the producer removes input fields that referenced its output,
  // preventing the editor from leaving broken data edges behind.
  assert.deepEqual(
    vibe.workflow.steps.map((step) => step.id),
    ["respond"],
  );
  assert.deepEqual(vibe.workflow.steps[0]?.input, {});
});

test("addStandaloneStepInYaml creates a blank vibe when source is empty", () => {
  const nextYaml = addStandaloneStepInYaml("");
  const vibe = parseVisualVibeYaml(nextYaml);

  assert.equal(vibe.workflow.id, "new-vibe");
  assert.equal(vibe.workflow.steps.length, 1);
  assert.equal(vibe.workflow.steps[0]?.id, "new_step_1");
});

test("addStandaloneStepInYaml preserves a provided standalone step template", () => {
  const nextYaml = addStandaloneStepInYaml("", {
    step: {
      id: "new_step_1",
      function: "setVariable",
      input: {
        variable_name: "customer_status",
        value: "new",
      },
    },
  });

  const vibe = parseVisualVibeYaml(nextYaml);

  assert.equal(vibe.workflow.steps[0]?.function, "setVariable");
  assert.equal(vibe.workflow.steps[0]?.input.variable_name, "customer_status");
  assert.equal(vibe.workflow.steps[0]?.input.value, "new");
});

test("addTemplateStepInYaml preserves YAML comments while inserting a registry-backed step", () => {
  const nextYaml = addTemplateStepInYaml(exampleYaml, {
    functionId: "sendResponse",
    input: {
      type: "text",
      message: "Thanks, I can help with that.",
    },
    placement: {
      kind: "appendAfter",
      sourceStepId: "load_profile",
    },
  });

  const vibe = parseVisualVibeYaml(nextYaml);

  assert.equal(vibe.workflow.steps[1]?.function, "sendResponse");
  assert.equal(vibe.workflow.steps[0]?.next_step_id, "new_step_3");
  assert.equal(
    getStepDescriptionFromYaml(nextYaml, "load_profile"),
    "Load the customer profile before responding.",
  );
});

test("addTemplateStepInYaml inserts a registry-backed step on an edge", () => {
  const nextYaml = addTemplateStepInYaml(exampleYaml, {
    functionId: "promptUser",
    input: {
      message: "Could you please provide a little more detail?",
    },
    placement: {
      kind: "onEdge",
      sourceStepId: "load_profile",
      targetStepId: "respond",
      edgeType: "next",
    },
  });

  const vibe = parseVisualVibeYaml(nextYaml);

  assert.deepEqual(
    vibe.workflow.steps.map((step) => step.id),
    ["load_profile", "new_step_3", "respond"],
  );
  assert.equal(vibe.workflow.steps[0]?.next_step_id, "new_step_3");
  assert.equal(vibe.workflow.steps[1]?.next_step_id, "respond");
});

test("updateConditionalExpressionInYaml updates common condition expression", () => {
  const yaml = `workflow:
  id: test
  name: Test
  steps:
    - id: branch
      function: handleConditional
      input:
        condition:
          expression: \${steps.score.output.value > 3}
          then: done
          else: failed
    - id: done
      function: concludeWorkflow
      input: {}
    - id: failed
      function: concludeWorkflow
      input: {}
`;

  const nextYaml = updateConditionalExpressionInYaml(
    yaml,
    "branch",
    "${steps.score.output.value > 7}",
  );

  assert.match(nextYaml, /expression: \$\{steps\.score\.output\.value > 7\}/);
});
