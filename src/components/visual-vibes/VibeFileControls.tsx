"use client";

type VibeFileControlsProps = {
  fileName: string | null;
  sourceType: "default" | "upload";
  onUploadYaml: (fileName: string, yamlText: string) => void;
  onError: (message: string) => void;
};

export function VibeFileControls({
  fileName,
  sourceType,
  onUploadYaml,
  onError,
}: VibeFileControlsProps) {
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isYamlFile =
      file.name.endsWith(".yml") || file.name.endsWith(".yaml");

    if (!isYamlFile) {
      onError("Please upload a .yml or .yaml file.");
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      onUploadYaml(file.name, text);
      event.target.value = "";
    } catch {
      onError("Could not read the uploaded YAML file.");
      event.target.value = "";
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--panel-muted-bg)] px-4 py-2">
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-[var(--text-primary)]">
          {sourceType === "upload" ? "Uploaded file" : "Default file"}
        </div>
        <div className="truncate text-xs text-[var(--text-muted)]">
          {fileName ?? "No file loaded"}
        </div>
      </div>

      <label className="cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--panel-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)]">
        Upload YAML
        <input
          type="file"
          accept=".yml,.yaml,text/yaml,application/x-yaml"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
}