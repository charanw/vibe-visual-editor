"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type VibeYamlEditorProps = {
  value: string;
  readOnly: boolean;
  onChange: (value: string) => void;
};

export function VibeYamlEditor({
  value,
  readOnly,
  onChange,
}: VibeYamlEditorProps) {
  const [theme, setTheme] = useState<"vs" | "vs-dark">("vs-dark");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function updateTheme() {
      setTheme(mediaQuery.matches ? "vs-dark" : "vs");
    }

    updateTheme();
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  return (
    <MonacoEditor
      height="100%"
      language="yaml"
      theme={theme}
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        wordWrap: "on",
        tabSize: 2,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  );
}