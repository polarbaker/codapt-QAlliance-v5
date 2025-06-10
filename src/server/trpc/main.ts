// Import polyfill first to ensure it runs before any code that might use File API
import '../../polyfill';

import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

const t = initTRPC.create({
  transformer: superjson,
  sse: {
    enabled: true,
    client: {
      reconnectAfterInactivityMs: 30000, // Reconnect after 30 seconds of inactivity
      maxReconnectAttempts: 10, // Allow up to 10 reconnection attempts
      reconnectBackoffMs: 1000, // Start with 1 second backoff
      maxReconnectBackoffMs: 30000, // Max 30 seconds between reconnection attempts
      heartbeatIntervalMs: 25000, // Send heartbeat every 25 seconds
      connectionTimeoutMs: 45000, // 45 second connection timeout
    },
    ping: {
      enabled: true,
      intervalMs: 15000, // Send ping every 15 seconds
      timeoutMs: 10000, // 10 second ping timeout
      maxMissedPings: 3, // Allow 3 missed pings before considering connection lost
    },
    // Enhanced error handling
    onError: (error) => {
      console.warn('SSE connection error:', error);
      // Log error details for debugging
      if (error instanceof Error) {
        console.warn('SSE error details:', {
          message: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        });
      }
    },
    // Connection state tracking
    onConnectionStateChange: (state) => {
      console.log('SSE connection state changed:', {
        state,
        timestamp: new Date().toISOString(),
      });
      
      // Track connection issues for monitoring
      if (state === 'error' || state === 'closed') {
        console.warn('SSE connection issue detected:', state);
      }
    },
  },
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
        // Enhanced error context for better debugging
        timestamp: new Date().toISOString(),
        errorType: error.constructor.name,
        // Add connection state information if available
        connectionState: 'unknown', // This would be populated by middleware
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const baseProcedure = t.procedure;
