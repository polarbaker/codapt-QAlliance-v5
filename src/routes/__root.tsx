import React from "react";
import {
  Outlet,
  createRootRoute,
  useRouterState,
  useLocation,
} from "@tanstack/react-router";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "react-hot-toast";
import Navigation from "~/components/Navigation";
import ErrorBoundary from "~/components/ErrorBoundary";
import { useTRPCHealthCheck } from "~/utils/trpc-health-check";

export const Route = createRootRoute({
  component: RootComponent,
});

// Development-only tRPC health check component
function TRPCHealthChecker() {
  // Use import.meta.env instead of process.env for client-side environment variables
  // Or check a different way to determine if we're in development
  const isDevelopment = import.meta.env.DEV;
  
  if (!isDevelopment) {
    return null;
  }

  try {
    const healthCheck = useTRPCHealthCheck();
    
    // Log health check results in development
    React.useEffect(() => {
      console.group('🔍 tRPC Health Check');
      console.log('Status:', healthCheck.isHealthy ? '✅ Healthy' : '❌ Issues Found');
      console.log('Available Procedures:', healthCheck.availableProcedures.length);
      
      if (healthCheck.missingProcedures.length > 0) {
        console.warn('Missing Procedures:', healthCheck.missingProcedures);
      }
      
      if (healthCheck.errors.length > 0) {
        console.error('Errors:', healthCheck.errors);
      }
      
      console.groupEnd();
    }, [healthCheck]);
  } catch (error) {
    console.error('tRPC Health Check Error:', error);
  }

  return null;
}

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });
  const location = useLocation();
  
  // Don't show main navigation on admin routes
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isFetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light dark:bg-background-black">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent mx-auto mb-4"></div>
          <p className="text-text-dark dark:text-text-light">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <TRPCReactProvider>
        <TRPCHealthChecker />
        <div className="min-h-screen bg-background-light dark:bg-background-black">
          {!isAdminRoute && <Navigation />}
          <main className={isAdminRoute ? "" : "pt-20"}>
            <Outlet />
          </main>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-background-black)',
                color: 'var(--color-text-light)',
                border: '1px solid var(--color-secondary)',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-secondary)',
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: 'white',
                },
              },
            }}
          />
        </div>
      </TRPCReactProvider>
    </ErrorBoundary>
  );
}
