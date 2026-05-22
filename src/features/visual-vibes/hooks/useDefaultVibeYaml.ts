import { useEffect } from "react";

type UseDefaultVibeYamlOptions = {
  setYamlText: (yamlText: string) => void;
  setFileName: (fileName: string) => void;
  setSourceType: (sourceType: "default" | "upload") => void;
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
  setLoadError,
}: UseDefaultVibeYamlOptions) {
  useEffect(() => {
    async function loadDefaultVibeYaml() {
      try {
        const response = await fetch("/vibes/example-vibe.yml");

        if (!response.ok) {
          throw new Error(`Failed to load YAML file: ${response.status}`);
        }

        const text = await response.text();

        setYamlText(text);
        setFileName("example-vibe.yml");
        setSourceType("default");
        setLoadError(null);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Failed to load YAML file",
        );
      }
    }

    loadDefaultVibeYaml();
  }, [setFileName, setLoadError, setSourceType, setYamlText]);
}
