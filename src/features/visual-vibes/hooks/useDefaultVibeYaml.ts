import { useEffect } from "react";
import { defaultExampleVibe } from "../examples/exampleVibes";

type UseDefaultVibeYamlOptions = {
  setYamlText: (yamlText: string, label?: string) => void;
  setFileName: (fileName: string) => void;
  setSourceType: (sourceType: "default" | "upload" | "example") => void;
  setSelectedExampleName: (exampleName: string | null) => void;
  setLoadError: (error: string | null) => void;
};

/**
 * Loads the bundled example vibe once when the editor mounts.
 *
 * Keeping this in a hook keeps the editor shell free of data-loading lifecycle
 * details while preserving the same state updates and error handling.
 */
export function useDefaultVibeYaml({
  setYamlText,
  setFileName,
  setSourceType,
  setSelectedExampleName,
  setLoadError,
}: UseDefaultVibeYamlOptions) {
  useEffect(() => {
    setYamlText(defaultExampleVibe.yaml, `Loaded example: ${defaultExampleVibe.name}`);
    setFileName(`${defaultExampleVibe.id}.yml`);
    setSourceType("example");
    setSelectedExampleName(defaultExampleVibe.name);
    setLoadError(null);
  }, [
    setFileName,
    setLoadError,
    setSelectedExampleName,
    setSourceType,
    setYamlText,
  ]);
}
