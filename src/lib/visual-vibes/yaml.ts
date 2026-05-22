import YAML from "yaml";
import { VisualVibeSchema, type VisualVibe } from "./schema";

export function parseVisualVibeYaml(yamlText: string): VisualVibe {
  const parsed = YAML.parse(yamlText);
  return VisualVibeSchema.parse(parsed);
}

export function stringifyVisualVibe(vibe: VisualVibe): string {
  return YAML.stringify(vibe);
}