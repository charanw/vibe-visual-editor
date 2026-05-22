import assert from "node:assert/strict";
import test from "node:test";
import { validateVisualVibeYaml } from "../validation";

test("validateVisualVibeYaml reports empty YAML", () => {
  assert.deepEqual(validateVisualVibeYaml("   "), [
    {
      level: "error",
      message: "YAML is empty.",
    },
  ]);
});

test("validateVisualVibeYaml reports duplicate and missing step references", () => {
  const issues = validateVisualVibeYaml(`
workflow:
  id: invalid_flow
  name: Invalid Flow
  steps:
    - id: first
      function: setVariable
      input:
        value: "\${steps.missing_data.output}"
      next_step_id: missing_next
      on_error_step_id: missing_error
    - id: first
      function: sendResponse
      input: {}
`);

  assert.deepEqual(
    issues.map((issue) => issue.message),
    [
      'Duplicate step id "first". Step ids must be unique.',
      'Step "first" has next_step_id "missing_next", but that step does not exist.',
      'Step "first" has on_error_step_id "missing_error", but that step does not exist.',
      'Step "first" references missing step "missing_data" in input.',
    ],
  );
});

test("validateVisualVibeYaml accepts a minimal valid vibe", () => {
  const issues = validateVisualVibeYaml(`
workflow:
  id: valid_flow
  name: Valid Flow
  steps:
    - id: first
      function: setVariable
      input: {}
`);

  assert.deepEqual(issues, []);
});
