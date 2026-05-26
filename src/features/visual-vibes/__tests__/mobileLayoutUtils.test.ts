import assert from "node:assert/strict";
import test from "node:test";
import { revealMobileInspector } from "../utils";

test("revealMobileInspector expands only the inspector pane", () => {
  const nextPanes = revealMobileInspector({
    source: true,
    canvas: false,
    inspector: true,
  });

  assert.deepEqual(nextPanes, {
    source: true,
    canvas: false,
    inspector: false,
  });
});
