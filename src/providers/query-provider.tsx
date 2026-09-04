"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider, HydrationBoundary, dehydrate } from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
  client?: QueryClient;
}

function QueryProvider({ children, client }: QueryProviderProps) {
  const [queryClient] = React.useState(
    () =>
      client ||
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

interface QueryBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

function QueryBoundary({ children, fallback, errorFallback }: QueryBoundaryProps) {
  return <>{children}</>;
}

function useQueryInvalidation() {
  const { useQueryClient } = require("@tanstack/react-query");
  const queryClient = useQueryClient();

  const invalidateQueries = React.useCallback(
    (filters?: { queryKey?: string[]; queryType?: string }) => {
      return queryClient.invalidateQueries(filters);
    },
    [queryClient]
  );

  const invalidateAll = React.useCallback(() => {
    return queryClient.invalidateQueries();
  }, [queryClient]);

  return { invalidateQueries, invalidateAll, queryClient };
}

interface InfiniteQueryProviderProps {
  children: React.ReactNode;
}

function InfiniteQueryProvider({ children }: InfiniteQueryProviderProps) {
  return <>{children}</>;
}

export { QueryProvider, QueryBoundary, useQueryInvalidation, InfiniteQueryProvider };
