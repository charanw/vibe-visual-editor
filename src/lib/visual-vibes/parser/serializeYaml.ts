import YAML from "yaml";
import type { VisualVibe } from "../schema";

/** Serializes a parsed and validated Visual Vibe model back to YAML. */
export function serializeVisualVibeYaml(vibe: VisualVibe): string {
  return YAML.stringify(vibe);
}
