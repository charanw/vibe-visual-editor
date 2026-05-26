import { useCallback, useMemo, useState, type SetStateAction } from "react";

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
  cleanValue: T;
};

type SetHistoryOptions = {
  replace?: boolean;
  markClean?: boolean;
};

export type EditorHistory<T> = {
  value: T;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  setValue: (nextValue: SetStateAction<T>, options?: SetHistoryOptions) => void;
  reset: (nextValue: T) => void;
  markClean: () => void;
  undo: () => void;
  redo: () => void;
};

/** Generic undo/redo history for editor-owned values. */
export function useEditorHistory<T>(initialValue: T): EditorHistory<T> {
  const [historyState, setHistoryState] = useState<HistoryState<T>>({
    past: [],
    present: initialValue,
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

        return {
          past: options.replace
            ? currentState.past
            : [...currentState.past, currentState.present],
          present: resolvedValue,
          future: [],
          cleanValue: options.markClean
            ? resolvedValue
            : currentState.cleanValue,
        };
      });
    },
    [],
  );

  const reset = useCallback((nextValue: T) => {
    setHistoryState({
      past: [],
      present: nextValue,
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
        present: previousValue,
        future: [currentState.present, ...currentState.future],
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
        past: [...currentState.past, currentState.present],
        present: nextValue,
        future: currentState.future.slice(1),
        cleanValue: currentState.cleanValue,
      };
    });
  }, []);

  return useMemo(
    () => ({
      value: historyState.present,
      canUndo: historyState.past.length > 0,
      canRedo: historyState.future.length > 0,
      isDirty: !Object.is(historyState.present, historyState.cleanValue),
      setValue,
      reset,
      markClean,
      undo,
      redo,
    }),
    [historyState, markClean, redo, reset, setValue, undo],
  );
}
