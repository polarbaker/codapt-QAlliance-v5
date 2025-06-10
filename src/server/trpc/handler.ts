// Import polyfill first to ensure it runs before any code that might use File API
import '../../polyfill';

import { defineEventHandler, toWebRequest } from "@tanstack/react-start/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root";

export default defineEventHandler((event) => {
  const request = toWebRequest(event);
  if (!request) {
    return new Response("No request", { status: 400 });
  }

  return fetchRequestHandler({
    endpoint: "/trpc",
    req: request,
    router: appRouter,
    responseMeta({ errors, type, paths, ctx }) {
      const headers = new Headers();
      // Use BASE_URL from environment for allowed origin
      const allowedOrigin = process.env.BASE_URL || request.headers.get('origin') || '*';
      headers.set('Access-Control-Allow-Origin', allowedOrigin);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
      headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-TRPC-Batch-Mode, X-Custom-Header'); // Add any custom headers your client sends
      headers.set('Access-Control-Allow-Credentials', 'true');

      if (request.method === 'OPTIONS') {
        // Handle preflight requests
        return {
          status: 204, // No Content
          headers,
        };
      }

      // Default cache-control for successful GET requests (queries)
      // Adjust as per your application's caching strategy
      if (type === 'query' && errors.length === 0) {
        headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
      }

      return {
        headers,
      };
    },
    createContext() {
      // You can add request-specific context here if needed by your procedures
      // e.g., return { req: request, event };
      return {};
    },
    onError({ error, path, type, ctx, req, input }) {
      console.error(
        `tRPC error on path: '${path}' (type: ${type}):`,
        error.message,
      );
      if (error.cause) {
        console.error(`tRPC error cause:`, error.cause);
      }
      // You could add more detailed logging here, e.g., input, ctx
    },
  });
});
