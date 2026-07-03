"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import { getStepIdAtYamlLine, getStepYamlRange } from "@/lib/visual-vibes/yaml";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

type MonacoEditorInstance = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

type VibeYamlEditorProps = {
  value: string;
  readOnly: boolean;
  selectedStepId: string | null;
  onChange: (value: string) => void;
  onSelectStepFromCursor: (stepId: string | null) => void;
};

/**
 * Monaco-backed YAML editor used by the source pane.
 *
 * The editor follows the user's system color scheme and leaves source-of-truth
 * YAML updates to the parent through `onChange`.
 */
export function VibeYamlEditor({
  value,
  readOnly,
  selectedStepId,
  onChange,
  onSelectStepFromCursor,
}: VibeYamlEditorProps) {
  const [theme, setTheme] = useState<"vs" | "vs-dark">("vs-dark");
  const editorRef = useRef<MonacoEditorInstance | null>(null);
  const monacoRef = useRef<MonacoInstance | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const selectedStepIdRef = useRef<string | null>(selectedStepId);

  useEffect(() => {
    selectedStepIdRef.current = selectedStepId;
  }, [selectedStepId]);

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

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    if (!editor || !monaco) {
      return;
    }

    const selectedRange = selectedStepId
      ? getStepYamlRange(value, selectedStepId)
      : null;

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      selectedRange
        ? [
            {
              range: new monaco.Range(
                selectedRange.startLineNumber,
                selectedRange.startColumn,
                selectedRange.endLineNumber,
                selectedRange.endColumn,
              ),
              options: {
                className: "vibe-yaml-selected-step",
                isWholeLine: true,
              },
            },
          ]
        : [],
    );

    if (selectedRange) {
      editor.revealRangeInCenterIfOutsideViewport(
        new monaco.Range(
          selectedRange.startLineNumber,
          selectedRange.startColumn,
          selectedRange.endLineNumber,
          selectedRange.endColumn,
        ),
      );
    }
  }, [selectedStepId, value]);

  function selectStepAtCursor(editor: MonacoEditorInstance) {
    const model = editor.getModel();
    const position = editor.getPosition();

    if (!model || !position) {
      return;
    }

    const stepId = getStepIdAtYamlLine(model.getValue(), position.lineNumber);

    if (stepId !== selectedStepIdRef.current) {
      selectedStepIdRef.current = stepId;
      onSelectStepFromCursor(stepId);
    }
  }

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const cursorSubscription = editor.onDidChangeCursorPosition(() => {
      selectStepAtCursor(editor);
    });
    editor.onDidDispose(() => cursorSubscription.dispose());
  };

  return (
    <MonacoEditor
      height="100%"
      language="yaml"
      theme={theme}
      value={value}
      onMount={handleMount}
      onChange={(nextValue) => {
        onChange(nextValue ?? "");
        const editor = editorRef.current;

        if (editor) {
          selectStepAtCursor(editor);
        }
      }}
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
