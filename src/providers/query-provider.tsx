"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

interface QueryProviderContextType {
  queryClient: QueryClient;
}

const QueryProviderContext = createContext<QueryProviderContextType | undefined>(
  undefined
);

interface QueryProviderProps {
  children: ReactNode;
  client?: QueryClient;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: false,
        refetchOnReconnect: "always",
        refetchOnMount: true,
      },
      mutations: {
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({
  children,
  client: providedClient,
}: QueryProviderProps) {
  const [queryClient] = useState(() => providedClient || getQueryClient());

  return (
    <QueryProviderContext.Provider value={{ queryClient }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </QueryProviderContext.Provider>
  );
}

export function useQueryProviderContext(): QueryProviderContextType {
  const context = useContext(QueryProviderContext);
  if (!context) {
    throw new Error(
      "useQueryProviderContext must be used within a QueryProvider"
    );
  }
  return context;
}
