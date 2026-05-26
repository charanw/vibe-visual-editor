import { getStepDescriptionFromYaml } from "@/lib/visual-vibes/yaml";
import { parseVisualVibeYaml } from "@/lib/visual-vibes/parser/parseYaml";
import { validateVisualVibeYaml } from "@/lib/visual-vibes/validation";
import { visualVibeToGraph } from "@/lib/visual-vibes/graph/buildGraph";

export function selectParsedVibeState(yamlText: string) {
  if (yamlText.trim().length === 0) {
    return {
      vibe: null,
      graph: null,
      error: null,
    };
  }

  try {
    const vibe = parseVisualVibeYaml(yamlText);
    const graph = visualVibeToGraph(vibe);

    return {
      vibe,
      graph,
      error: null,
    };
  } catch (error) {
    return {
      vibe: null,
      graph: null,
      error: error instanceof Error ? error.message : "Invalid YAML",
    };
  }
}

export function selectValidationIssues(yamlText: string) {
  return validateVisualVibeYaml(yamlText);
}

export function selectSelectedStepDescription(
  yamlText: string,
  selectedStepId: string | null,
) {
  if (!selectedStepId) {
    return "";
  }

  return getStepDescriptionFromYaml(yamlText, selectedStepId);
}
