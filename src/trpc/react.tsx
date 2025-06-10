// Import polyfill first to ensure it runs before any code that might use File API
import '../polyfill';

import { QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink, loggerLink, splitLink, httpSubscriptionLink } from "@trpc/client";
import SuperJSON from "superjson";
import { createContext, useContext, useState, useEffect, useRef } from "react";

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

// Connection state tracking
interface ConnectionState {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  eventQueue: Array<{ type: string; data: any; timestamp: number }>;
  isOnline: boolean;
}

// Connection context for sharing state across components
const ConnectionContext = createContext<{
  connectionState: ConnectionState;
  setConnectionState: (state: Partial<ConnectionState>) => void;
} | null>(null);

// Create tRPC client context
const TRPCClientContext = createContext<ReturnType<typeof createTRPCClient<AppRouter>> | null>(null);

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [connectionState, setConnectionStateInternal] = useState<ConnectionState>({
    status: 'connecting',
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    eventQueue: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const eventQueueRef = useRef<ConnectionState['eventQueue']>([]);
  
  // Update connection state with persistence
  const setConnectionState = (updates: Partial<ConnectionState>) => {
    setConnectionStateInternal(prev => {
      const newState = { ...prev, ...updates };
      eventQueueRef.current = newState.eventQueue;
      return newState;
    });
  };
  
  // Enhanced reconnection logic with exponential backoff
  const scheduleReconnect = (attemptNumber: number) => {
    if (attemptNumber >= connectionState.maxReconnectAttempts) {
      console.warn('Max reconnection attempts reached, giving up');
      setConnectionState({ status: 'error' });
      return;
    }
    
    const backoffMs = Math.min(1000 * Math.pow(2, attemptNumber), 30000); // Max 30 seconds
    console.log(`Scheduling reconnection attempt ${attemptNumber + 1} in ${backoffMs}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`Attempting reconnection ${attemptNumber + 1}/${connectionState.maxReconnectAttempts}`);
      setConnectionState({ 
        status: 'connecting',
        reconnectAttempts: attemptNumber + 1 
      });
      
      // The actual reconnection will be handled by the tRPC client
      // This just updates our tracking state
    }, backoffMs);
  };
  
  // Network state monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network came online');
      setConnectionState({ isOnline: true });
      
      // Reset reconnection attempts when network comes back
      if (connectionState.status === 'disconnected' || connectionState.status === 'error') {
        setConnectionState({ 
          status: 'connecting',
          reconnectAttempts: 0 
        });
      }
    };
    
    const handleOffline = () => {
      console.log('Network went offline');
      setConnectionState({ 
        isOnline: false,
        status: 'disconnected' 
      });
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, [connectionState.status]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

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
            // Enhanced error handling for HTTP requests
            fetch: async (url, options) => {
              try {
                const response = await fetch(url, {
                  ...options,
                  signal: AbortSignal.timeout(30000), // 30 second timeout
                });
                
                if (!response.ok) {
                  console.warn('HTTP request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    url,
                  });
                }
                
                return response;
              } catch (error) {
                console.error('HTTP request error:', error);
                
                // Update connection state on fetch errors
                if (error instanceof Error && error.name === 'AbortError') {
                  setConnectionState({ status: 'error' });
                }
                
                throw error;
              }
            },
          }),
          true: httpSubscriptionLink({
            transformer: SuperJSON,
            url: getBaseUrl() + "/trpc",
            // Enhanced WebSocket connection handling
            connectionParams: () => ({
              // Add connection metadata
              clientId: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
              timestamp: new Date().toISOString(),
            }),
            // Connection event handlers
            onConnectionStateChange: (state) => {
              console.log('WebSocket connection state changed:', state);
              
              switch (state) {
                case 'connecting':
                  setConnectionState({ status: 'connecting' });
                  break;
                case 'open':
                  setConnectionState({ 
                    status: 'connected',
                    lastConnected: new Date(),
                    reconnectAttempts: 0 // Reset on successful connection
                  });
                  
                  // Process queued events
                  if (eventQueueRef.current.length > 0) {
                    console.log(`Processing ${eventQueueRef.current.length} queued events`);
                    // Events would be processed here in a real implementation
                    setConnectionState({ eventQueue: [] });
                  }
                  break;
                case 'closed':
                  setConnectionState({ status: 'disconnected' });
                  
                  // Schedule reconnection if network is online
                  if (connectionState.isOnline) {
                    scheduleReconnect(connectionState.reconnectAttempts);
                  }
                  break;
                case 'error':
                  setConnectionState({ status: 'error' });
                  
                  // Schedule reconnection on error if we haven't exceeded max attempts
                  if (connectionState.reconnectAttempts < connectionState.maxReconnectAttempts) {
                    scheduleReconnect(connectionState.reconnectAttempts);
                  }
                  break;
              }
            },
            // Enhanced error handling
            onError: (error) => {
              console.error('WebSocket subscription error:', error);
              setConnectionState({ status: 'error' });
            },
          }),
        }),
      ],
    }),
  );

  return (
    <ConnectionContext.Provider value={{ connectionState, setConnectionState }}>
      <TRPCClientContext.Provider value={trpcClient}>
        <QueryClientProvider client={queryClient}>
          {props.children}
        </QueryClientProvider>
      </TRPCClientContext.Provider>
    </ConnectionContext.Provider>
  );
}

export function useTRPCClient() {
  const client = useContext(TRPCClientContext);
  if (!client) {
    throw new Error("useTRPCClient must be used within TRPCReactProvider");
  }
  return client;
}

// Hook for accessing connection state
export function useConnectionState() {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("useConnectionState must be used within TRPCReactProvider");
  }
  return context;
}

// Hook for queuing events during disconnection
export function useEventQueue() {
  const { connectionState, setConnectionState } = useConnectionState();
  
  const queueEvent = (type: string, data: any) => {
    if (connectionState.status !== 'connected') {
      const newEvent = {
        type,
        data,
        timestamp: Date.now(),
      };
      
      setConnectionState({
        eventQueue: [...connectionState.eventQueue, newEvent],
      });
      
      console.log('Event queued during disconnection:', newEvent);
      return true;
    }
    
    return false; // Event not queued, connection is available
  };
  
  const clearEventQueue = () => {
    setConnectionState({ eventQueue: [] });
  };
  
  return {
    queueEvent,
    clearEventQueue,
    queuedEvents: connectionState.eventQueue,
    isConnected: connectionState.status === 'connected',
  };
}

// Simplified and more robust tRPC hook interface
export function useTRPC() {
  const client = useTRPCClient();
  const queryClient = useQueryClient();
  
  // Create a proxy that dynamically exposes all procedures
  return new Proxy({} as any, {
    get(target, procedureName: string) {
      // Return an object with direct hooks and legacy options
      return {
        // Direct hooks (new pattern)
        useQuery: (input?: any, options?: any) => {
          return useQuery({
            queryKey: [procedureName, input],
            queryFn: async () => {
              const procedure = (client as any)[procedureName];
              if (!procedure || typeof procedure.query !== 'function') {
                throw new Error(`tRPC procedure '${procedureName}' not found or is not a query`);
              }
              return procedure.query(input);
            },
            ...options,
          });
        },
        
        useMutation: (options?: any) => {
          return useMutation({
            mutationFn: async (input: any) => {
              const procedure = (client as any)[procedureName];
              if (!procedure || typeof procedure.mutate !== 'function') {
                throw new Error(`tRPC procedure '${procedureName}' not found or is not a mutation`);
              }
              return procedure.mutate(input);
            },
            ...options,
          });
        },
        
        // Legacy options (for backward compatibility)
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
