import { useCallback, useMemo, useState, type SetStateAction } from "react";

type HistoryState<T> = {
  past: HistoryEntry<T>[];
  present: T;
  presentLabel: string | null;
  future: HistoryEntry<T>[];
  cleanValue: T;
};

type SetHistoryOptions = {
  replace?: boolean;
  markClean?: boolean;
  label?: string;
};

export type HistoryEntry<T> = {
  value: T;
  label: string;
};

export type HistoryDisplayItem = {
  label: string;
  isCurrent: boolean;
};

export type EditorHistory<T> = {
  value: T;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  historyItems: HistoryDisplayItem[];
  setValue: (nextValue: SetStateAction<T>, options?: SetHistoryOptions) => void;
  reset: (nextValue: T, label?: string) => void;
  markClean: () => void;
  undo: () => void;
  redo: () => void;
};

/** Generic undo/redo history for editor-owned values. */
export function useEditorHistory<T>(initialValue: T): EditorHistory<T> {
  const [historyState, setHistoryState] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
    presentLabel: null,
    future: [],
    cleanValue: initialValue,
  });

  const setValue = useCallback(
    (nextValue: SetStateAction<T>, options: SetHistoryOptions = {}) => {
      setHistoryState((currentState) => {
        const resolvedValue =
          typeof nextValue === "function"
            ? (nextValue as (currentValue: T) => T)(currentState.present)
            : nextValue;

        if (Object.is(resolvedValue, currentState.present)) {
          return currentState;
        }

        const nextLabel = options.label ?? "Edited YAML";

        return {
          past: options.replace
            ? currentState.past
            : [
                ...currentState.past,
                {
                  value: currentState.present,
                  label: currentState.presentLabel ?? "Previous YAML",
                },
              ],
          present: resolvedValue,
          presentLabel: nextLabel,
          future: [],
          cleanValue: options.markClean
            ? resolvedValue
            : currentState.cleanValue,
        };
      });
    },
    [],
  );

  const reset = useCallback((nextValue: T, label: string | null = null) => {
    setHistoryState({
      past: [],
      present: nextValue,
      presentLabel: label,
      future: [],
      cleanValue: nextValue,
    });
  }, []);

  const markClean = useCallback(() => {
    setHistoryState((currentState) => ({
      ...currentState,
      cleanValue: currentState.present,
    }));
  }, []);

  const undo = useCallback(() => {
    setHistoryState((currentState) => {
      const previousValue = currentState.past.at(-1);

      if (previousValue === undefined) {
        return currentState;
      }

      return {
        past: currentState.past.slice(0, -1),
        present: previousValue.value,
        presentLabel: previousValue.label,
        future: [
          {
            value: currentState.present,
            label: currentState.presentLabel ?? "Current YAML",
          },
          ...currentState.future,
        ],
        cleanValue: currentState.cleanValue,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistoryState((currentState) => {
      const nextValue = currentState.future[0];

      if (nextValue === undefined) {
        return currentState;
      }

      return {
        past: [
          ...currentState.past,
          {
            value: currentState.present,
            label: currentState.presentLabel ?? "Previous YAML",
          },
        ],
        present: nextValue.value,
        presentLabel: nextValue.label,
        future: currentState.future.slice(1),
        cleanValue: currentState.cleanValue,
      };
    });
  }, []);

  const historyItems = useMemo(() => {
    const items: HistoryDisplayItem[] = [];

    if (historyState.presentLabel) {
      items.push({
        label: historyState.presentLabel,
        isCurrent: true,
      });
    }

    for (const entry of historyState.past.slice(-7).reverse()) {
      items.push({
        label: entry.label,
        isCurrent: false,
      });
    }

    return items;
  }, [historyState.past, historyState.presentLabel]);

  return useMemo(
    () => ({
      value: historyState.present,
      canUndo: historyState.past.length > 0,
      canRedo: historyState.future.length > 0,
      isDirty: !Object.is(historyState.present, historyState.cleanValue),
      historyItems,
      setValue,
      reset,
      markClean,
      undo,
      redo,
    }),
    [historyItems, historyState, markClean, redo, reset, setValue, undo],
  );
}
