import assert from "node:assert/strict";
import test from "node:test";
import type { VisualVibe } from "../schema";
import {
  addRoutingEdge,
  addStandaloneStep,
  deleteRoutingEdge,
  deleteStep,
  renameStep,
  reorderSteps,
  updateStep,
  updateStepField,
  updateWorkflowField,
} from "../mutations";

const workflow: VisualVibe["workflow"] = {
  id: "support_flow",
  name: "Support Flow",
  description: "Handles a support request.",
  steps: [
    {
      id: "load_profile",
      function: "apiRequest",
      input: {
        endpoint: "/customers/profile",
      },
      next_step_id: "respond",
    },
    {
      id: "respond",
      function: "sendResponse",
      input: {
        message: "Profile: ${steps.load_profile.output}",
      },
    },
  ],
};

test("addStandaloneStep returns a new workflow with a generated step", () => {
  const nextWorkflow = addStandaloneStep(workflow);

  assert.notEqual(nextWorkflow, workflow);
  assert.equal(workflow.steps.length, 2);
  assert.equal(nextWorkflow.steps.length, 3);
  assert.equal(nextWorkflow.steps[2]?.id, "new_step_3");
});

test("updateStepField updates a nested step path without mutating input", () => {
  const nextWorkflow = updateStepField(workflow, {
    stepId: "load_profile",
    path: "input.endpoint",
    value: "/customers/active-profile",
  });

  assert.equal(workflow.steps[0]?.input.endpoint, "/customers/profile");
  assert.equal(
    nextWorkflow.steps[0]?.input.endpoint,
    "/customers/active-profile",
  );
});

test("updateWorkflowField updates workflow-level fields immutably", () => {
  const nextWorkflow = updateWorkflowField(workflow, {
    path: "description",
    value: "Updated description.",
  });

  assert.equal(workflow.description, "Handles a support request.");
  assert.equal(nextWorkflow.description, "Updated description.");
});

test("renameStep rewrites routing and interpolation references", () => {
  const nextWorkflow = renameStep(workflow, {
    stepId: "load_profile",
    nextStepId: "fetch_profile",
  });

  assert.equal(nextWorkflow.steps[0]?.id, "fetch_profile");
  assert.equal(
    nextWorkflow.steps[1]?.input.message,
    "Profile: ${steps.fetch_profile.output}",
  );
});

test("updateStep renames and updates editable step fields", () => {
  const nextWorkflow = updateStep(workflow, {
    stepId: "load_profile",
    updates: {
      id: "fetch_profile",
      functionName: "httpRequest",
      input: {
        url: "https://api.example.com/profile",
      },
    },
  });

  assert.equal(nextWorkflow.steps[0]?.id, "fetch_profile");
  assert.equal(nextWorkflow.steps[0]?.function, "httpRequest");
  assert.deepEqual(nextWorkflow.steps[0]?.input, {
    url: "https://api.example.com/profile",
  });
});

test("deleteStep removes the step and cleans stale references", () => {
  const nextWorkflow = deleteStep(workflow, {
    stepId: "load_profile",
  });

  assert.deepEqual(
    nextWorkflow.steps.map((step) => step.id),
    ["respond"],
  );
  assert.deepEqual(nextWorkflow.steps[0]?.input, {});
});

test("routing mutations add and remove workflow edges", () => {
  const withoutRouting = {
    ...workflow,
    steps: workflow.steps.map((step) => ({
      ...step,
      next_step_id: undefined,
    })),
  };
  const routedWorkflow = addRoutingEdge(withoutRouting, {
    sourceStepId: "load_profile",
    targetStepId: "respond",
  });

  assert.equal(routedWorkflow.steps[0]?.next_step_id, "respond");

  const unroutedWorkflow = deleteRoutingEdge(routedWorkflow, {
    sourceStepId: "load_profile",
    targetStepId: "respond",
    edgeType: "next",
  });

  assert.equal(unroutedWorkflow.steps[0]?.next_step_id, undefined);
});

test("reorderSteps returns workflow steps in requested order", () => {
  const nextWorkflow = reorderSteps(workflow, ["respond", "load_profile"]);

  assert.deepEqual(
    nextWorkflow.steps.map((step) => step.id),
    ["respond", "load_profile"],
  );
});
