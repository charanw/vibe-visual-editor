import YAML from "yaml";
import { VisualVibeSchema, type VisualVibe } from "../schema";

/**
 * Parses YAML text into a validated Visual Vibe object.
 *
 * Throws when the YAML is invalid or when required workflow fields are missing.
 */
export function parseVisualVibeYaml(yamlText: string): VisualVibe {
  const parsed = YAML.parse(yamlText);
  return VisualVibeSchema.parse(parsed);
}
