import assert from "node:assert/strict";
import test from "node:test";
import {
  createStepTemplate,
  createWizardStepTemplate,
  createUniqueStepId,
} from "../functions";

test("createUniqueStepId skips existing ids", () => {
  assert.equal(createUniqueStepId(["new_step_1", "new_step_2"]), "new_step_3");
});

test("createStepTemplate uses registry defaults for common and control-flow functions", () => {
  const apiStep = createStepTemplate(["load_profile"], "apiRequest", {
    nextStepId: "next_step",
  });
  const customStep = createStepTemplate(["load_profile"], "sendResponse", {
    input: {
      type: "html",
      message: "<strong>Hello</strong>",
    },
  });
  const branchStep = createStepTemplate(["load_profile"], "handleConditional");
  const workflowStep = createStepTemplate(["load_profile"], "invokeWorkflow");
  const wizardTemplate = createWizardStepTemplate("apiRequest");
  const conditionalWizardTemplate = createWizardStepTemplate("handleConditional");
  const loopWizardTemplate = createWizardStepTemplate("loopFlow");

  if (
    !apiStep ||
    !customStep ||
    !branchStep ||
    !workflowStep ||
    !wizardTemplate ||
    !conditionalWizardTemplate ||
    !loopWizardTemplate
  ) {
    throw new Error("Expected step templates to be created.");
  }

  assert.equal(apiStep.function, "apiRequest");
  assert.equal(apiStep.next_step_id, "next_step");
  assert.equal(apiStep.input["endpoint"], "https://api.example.com/resource");
  assert.equal(customStep.input.message, "<strong>Hello</strong>");
  assert.equal(customStep.input.type, "html");
  assert.equal(branchStep.function, "handleConditional");
  const branchCondition = branchStep.input["condition"] as
    | Record<string, unknown>
    | undefined;
  assert.equal(branchCondition?.then, "new_customer_step");
  assert.equal(branchCondition?.else, "existing_customer_step");
  assert.equal(workflowStep.function, "invokeWorkflow");
  assert.equal(workflowStep.input["workflow_id"], "workflow_id_to_invoke");
  assert.equal(wizardTemplate.definition.label, "API Request");
  assert.equal(wizardTemplate.fields.length > 0, true);
  assert.equal(wizardTemplate.fields[0]?.example.length > 0, true);
  assert.equal(conditionalWizardTemplate.fields[0]?.label, "Condition");
  assert.equal(conditionalWizardTemplate.fields[0]?.editorKind, "json");
  assert.equal(loopWizardTemplate.fields[0]?.label, "Items");
});
