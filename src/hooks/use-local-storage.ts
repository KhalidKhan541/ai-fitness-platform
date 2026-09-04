import { useState, useCallback, useEffect } from "react";

interface UseLocalStorageOptions<T> {
  serializer?: (value: T) => string;
  deserializer?: (value: string) => T;
  onError?: (error: Error) => void;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    onError = console.error,
  } = options;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? deserializer(item) : initialValue;
    } catch (error) {
      onError(error as Error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, serializer(valueToStore));
        }
      } catch (error) {
        onError(error as Error);
      }
    },
    [key, serializer, storedValue, onError]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      onError(error as Error);
    }
  }, [key, initialValue, onError]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        setStoredValue(e.newValue ? deserializer(e.newValue) : initialValue);
      } catch (error) {
        onError(error as Error);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, deserializer, initialValue, onError]);

  return [storedValue, setValue, removeValue];
}
