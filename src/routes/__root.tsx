import {
  Outlet,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "react-hot-toast";
import Navigation from "~/components/Navigation";
import ErrorBoundary from "~/components/ErrorBoundary";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });

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
        <div className="min-h-screen bg-background-light dark:bg-background-black">
          <Navigation />
          <main>
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
