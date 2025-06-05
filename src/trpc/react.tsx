import { QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink, splitLink, httpSubscriptionLink } from "@trpc/client";
import SuperJSON from "superjson";
import { createContext, useContext, useState } from "react";

import { AppRouter } from "~/server/trpc/root";
import { getQueryClient } from "./query-client";

function getBaseUrl() {
  if (typeof window !== "undefined") {
    // Browser: use current origin
    return window.location.origin;
  }
  
  // Server: check for BASE_URL environment variable first, fallback to localhost:3000 for internal calls
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  // Fallback for server-side internal calls (within Docker network)
  return `http://localhost:3000`;
}

// Create tRPC client context
const TRPCClientContext = createContext<ReturnType<typeof createTRPCClient<AppRouter>> | null>(null);

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        splitLink({
          condition: (op) => op.type === "subscription",
          false: httpBatchLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
          }),
          true: httpSubscriptionLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
          }),
        }),
      ],
    }),
  );

  return (
    <TRPCClientContext.Provider value={trpcClient}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TRPCClientContext.Provider>
  );
}

export function useTRPCClient() {
  const client = useContext(TRPCClientContext);
  if (!client) {
    throw new Error("useTRPCClient must be used within TRPCReactProvider");
  }
  return client;
}

// Simplified and more robust tRPC hook interface
export function useTRPC() {
  const client = useTRPCClient();
  
  // Create a proxy that dynamically exposes all procedures
  return new Proxy({} as any, {
    get(target, procedureName: string) {
      // Return an object with queryOptions, mutationOptions, etc.
      return {
        queryOptions: (input?: any, options?: any) => ({
          queryKey: [procedureName, input],
          queryFn: async () => {
            const procedure = (client as any)[procedureName];
            if (!procedure || typeof procedure.query !== 'function') {
              throw new Error(`tRPC procedure '${procedureName}' not found or is not a query`);
            }
            return procedure.query(input);
          },
          ...options,
        }),
        
        mutationOptions: (options?: any) => ({
          mutationFn: async (input: any) => {
            const procedure = (client as any)[procedureName];
            if (!procedure || typeof procedure.mutate !== 'function') {
              throw new Error(`tRPC procedure '${procedureName}' not found or is not a mutation`);
            }
            return procedure.mutate(input);
          },
          ...options,
        }),
        
        queryKey: (input?: any) => [procedureName, input],
        
        // Direct access to the procedure for advanced usage
        query: async (input?: any) => {
          const procedure = (client as any)[procedureName];
          if (!procedure || typeof procedure.query !== 'function') {
            throw new Error(`tRPC procedure '${procedureName}' not found or is not a query`);
          }
          return procedure.query(input);
        },
        
        mutate: async (input?: any) => {
          const procedure = (client as any)[procedureName];
          if (!procedure || typeof procedure.mutate !== 'function') {
            throw new Error(`tRPC procedure '${procedureName}' not found or is not a mutation`);
          }
          return procedure.mutate(input);
        },
      };
    },
  });
}
