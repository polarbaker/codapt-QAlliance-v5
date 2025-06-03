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

// Create a helper function to determine if a procedure is a query or mutation
function getProcedureType(procedureName: string): 'query' | 'mutation' {
  // Mutations typically include these keywords
  const mutationKeywords = ['submit', 'create', 'update', 'delete', 'post', 'like', 'subscribe', 'unsubscribe', 'reorder'];
  
  return mutationKeywords.some(keyword => procedureName.toLowerCase().includes(keyword)) 
    ? 'mutation' 
    : 'query';
}

// Create the trpc object that provides the expected interface
export const trpc = new Proxy({} as any, {
  get(target, procedureName) {
    if (typeof procedureName === 'string') {
      const procedureType = getProcedureType(procedureName);
      
      if (procedureType === 'query') {
        return {
          queryOptions: (input?: any, options?: any) => ({
            queryKey: [procedureName, input],
            queryFn: async () => {
              // We'll create a client on-demand for the query function
              // This approach avoids hook violations since queryFn is called by useQuery
              const client = createTRPCClient<AppRouter>({
                links: [
                  httpBatchLink({
                    transformer: SuperJSON,
                    url: getBaseUrl() + "/trpc",
                  }),
                ],
              });
              return (client as any)[procedureName].query(input);
            },
            ...options,
          }),
          
          queryKey: (input?: any) => [procedureName, input],
        };
      } else {
        return {
          mutationOptions: (options?: any) => ({
            mutationFn: async (input: any) => {
              // We'll create a client on-demand for the mutation function
              // This approach avoids hook violations since mutationFn is called by useMutation
              const client = createTRPCClient<AppRouter>({
                links: [
                  httpBatchLink({
                    transformer: SuperJSON,
                    url: getBaseUrl() + "/trpc",
                  }),
                ],
              });
              return (client as any)[procedureName].mutate(input);
            },
            ...options,
          }),
          
          mutationKey: () => [procedureName],
        };
      }
    }
    return target[procedureName];
  },
});

// Keep useTRPC for compatibility
export function useTRPC() {
  // Return an object that has all the procedure names as properties
  return trpc;
}
