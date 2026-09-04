import { useState, useCallback, useEffect, useRef } from "react";

interface UseFetchOptions<T> {
  immediate?: boolean;
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retryCount?: number;
  retryDelay?: number;
}

interface UseFetchResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  execute: (...args: unknown[]) => Promise<T | undefined>;
  reset: () => void;
}

export function useFetch<T>(
  fetcher: (...args: unknown[]) => Promise<T>,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    immediate = false,
    initialData,
    onSuccess,
    onError,
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(immediate);
  const mountedRef = useRef(true);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: unknown[]): Promise<T | undefined> => {
      const fetchId = ++fetchIdRef.current;
      setIsLoading(true);
      setError(undefined);

      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
          const result = await fetcher(...args);
          if (mountedRef.current && fetchId === fetchIdRef.current) {
            setData(result);
            setIsLoading(false);
            onSuccess?.(result);
          }
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < retryCount) {
            await new Promise((resolve) =>
              setTimeout(resolve, retryDelay * (attempt + 1))
            );
          }
        }
      }

      if (mountedRef.current && fetchId === fetchIdRef.current) {
        setError(lastError);
        setIsLoading(false);
        onError?.(lastError!);
      }
      return undefined;
    },
    [fetcher, retryCount, retryDelay, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(undefined);
    setIsLoading(false);
  }, [initialData]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return {
    data,
    error,
    isLoading,
    isSuccess: !isLoading && error === undefined && data !== undefined,
    isError: !isLoading && error !== undefined,
    execute,
    reset,
  };
}
