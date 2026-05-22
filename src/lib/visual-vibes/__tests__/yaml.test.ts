import assert from "node:assert/strict";
import test from "node:test";
import {
  addStandaloneStepInYaml,
  deleteStepInYaml,
  getStepDescriptionFromYaml,
  parseVisualVibeYaml,
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
