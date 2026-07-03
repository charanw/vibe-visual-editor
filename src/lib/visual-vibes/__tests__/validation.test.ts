import assert from "node:assert/strict";
import test from "node:test";
import { validateVisualVibeYaml } from "../validation";

test("validateVisualVibeYaml reports empty YAML", () => {
  assert.deepEqual(validateVisualVibeYaml("   "), [
    {
      level: "error",
      id: "empty-yaml",
      code: "empty_yaml",
      message: "YAML is empty.",
    },
  ]);
});

test("validateVisualVibeYaml reports missing conditional branch references", () => {
  const issues = validateVisualVibeYaml(`
workflow:
  id: invalid_branch_flow
  name: Invalid Branch Flow
  steps:
    - id: branch
      function: handleConditional
      input:
        condition:
          expression: "\${uniqueData.ready == true}"
          then: missing_then
          else: missing_else
`);

  assert.deepEqual(
    issues.map((issue) => ({
      code: issue.code,
      stepId: issue.stepId,
      missingStepId: issue.metadata?.missingStepId,
      branch: issue.metadata?.branch,
    })),
    [
      {
        code: "missing_conditional_branch",
        stepId: "branch",
        missingStepId: "missing_then",
        branch: "then",
      },
      {
        code: "missing_conditional_branch",
        stepId: "branch",
        missingStepId: "missing_else",
        branch: "else",
      },
    ],
  );
});

test("validateVisualVibeYaml reports missing switch case references", () => {
  const issues = validateVisualVibeYaml(`
workflow:
  id: invalid_switch_flow
  name: Invalid Switch Flow
  steps:
    - id: route_status
      function: handleConditional
      input:
        condition:
          type: switch
          expression: "\${steps.lookup.output.status}"
          cases:
            - value: open
              stepId: missing_open
    - id: lookup
      function: apiRequest
      input: {}
`);

  assert.deepEqual(
    issues.map((issue) => ({
      code: issue.code,
      stepId: issue.stepId,
      missingStepId: issue.metadata?.missingStepId,
      branch: issue.metadata?.branch,
    })),
    [
      {
        code: "missing_conditional_branch",
        stepId: "route_status",
        missingStepId: "missing_open",
        branch: "case",
      },
    ],
  );
});

test("validateVisualVibeYaml reports missing nested loop step routing", () => {
  const issues = validateVisualVibeYaml(`
workflow:
  id: invalid_loop_flow
  name: Invalid Loop Flow
  steps:
    - id: process_items
      function: loopFlow
      input:
        iterable: "\${steps.load.output.items}"
        steps:
          - id: process_item
            function: aiProcessing
            next_step_id: missing_loop_step
            input:
              prompt: "\${currentElement}"
`);

  assert.deepEqual(
    issues.map((issue) => ({
      code: issue.code,
      stepId: issue.stepId,
      missingStepId: issue.metadata?.missingStepId,
    })),
    [
      {
        code: "missing_input_reference",
        stepId: "process_items",
        missingStepId: "load",
      },
      {
        code: "missing_next_step",
        stepId: "process_items",
        missingStepId: "missing_loop_step",
      },
    ],
  );
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
