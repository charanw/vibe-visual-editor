import assert from "node:assert/strict";
import test from "node:test";
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
