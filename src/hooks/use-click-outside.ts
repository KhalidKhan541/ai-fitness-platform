import { useEffect, useRef, RefObject } from "react";

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
  options?: {
    enabled?: boolean;
    excludeRef?: RefObject<HTMLElement>;
  }
): RefObject<T> {
  const ref = useRef<T>(null);
  const { enabled = true, excludeRef } = options || {};

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (!ref.current || ref.current.contains(target)) return;

      if (excludeRef?.current?.contains(target)) return;

      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [handler, enabled, excludeRef]);

  return ref;
}
