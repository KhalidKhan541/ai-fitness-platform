import { useEffect, useCallback } from "react";

interface UseKeyPressOptions {
  enabled?: boolean;
  target?: "document" | "window";
}

export function useKeyPress(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: UseKeyPressOptions = {}
): void {
  const { enabled = true, target = "document" } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      if (event.key === key) {
        handler(event);
      }
    },
    [key, handler, enabled]
  );

  useEffect(() => {
    const targetElement = target === "window" ? window : document;
    targetElement.addEventListener("keydown", handleKeyDown as EventListener);
    return () =>
      targetElement.removeEventListener(
        "keydown",
        handleKeyDown as EventListener
      );
  }, [handleKeyDown, target]);
}

export function useKeyCombination(
  keys: string[],
  handler: (event: KeyboardEvent) => void,
  options: UseKeyPressOptions = {}
): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const pressedKeys = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.add(event.key);
      const allPressed = keys.every((key) => pressedKeys.has(key));
      if (allPressed) {
        handler(event);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(event.key);
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [keys, handler, enabled]);
}

export function useEscapeKey(
  handler: () => void,
  options: UseKeyPressOptions = {}
): void {
  useKeyPress("Escape", handler, options);
}

export function useEnterKey(
  handler: (event: KeyboardEvent) => void,
  options: UseKeyPressOptions = {}
): void {
  useKeyPress("Enter", handler, options);
}
