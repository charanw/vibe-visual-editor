import { useMemo, useState } from "react";
import { getStepDescriptionFromYaml } from "@/lib/visual-vibes/yaml";
import { parseVisualVibeYaml } from "@/lib/visual-vibes/parser/parseYaml";
import { validateVisualVibeYaml } from "@/lib/visual-vibes/validation";
import { visualVibeToGraph } from "@/lib/visual-vibes/graph/buildGraph";

/**
 * Hook for managing YAML content and parsing state.
 * Handles YAML loading, parsing, validation, and selected step tracking.
 */
export function useVibeState() {
  const [yamlText, setYamlText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"default" | "upload">("default");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const parsedResult = useMemo(() => {
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
  }, [yamlText]);

  const validationIssues = useMemo(() => {
    return validateVisualVibeYaml(yamlText);
  }, [yamlText]);

  const selectedStepDescription = useMemo(() => {
    if (!selectedStepId) {
      return "";
    }

    return getStepDescriptionFromYaml(yamlText, selectedStepId);
  }, [yamlText, selectedStepId]);

  return {
    // YAML content
    yamlText,
    setYamlText,
    fileName,
    setFileName,
    sourceType,
    setSourceType,
    loadError,
    setLoadError,

    // Parsed state
    parsedResult,
    validationIssues,

    // Selected step
    selectedStepId,
    setSelectedStepId,
    selectedStepDescription,
  };
}
