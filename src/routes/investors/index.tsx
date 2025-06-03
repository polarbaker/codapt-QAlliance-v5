import { createFileRoute } from "@tanstack/react-router";

function Investors() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-20">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="py-16">
          <h1 className="text-4xl font-bold text-text-dark dark:text-text-light mb-8">
            Investors
          </h1>
          <p className="text-lg text-text-dark/70 dark:text-text-light/70 mb-8">
            Connect with our network of investors and funding opportunities for innovative solutions.
          </p>
          <div className="bg-neutral-light dark:bg-neutral-dark rounded-lg p-8 text-center">
            <p className="text-text-dark dark:text-text-light">
              Investor information and opportunities coming soon. We're building a comprehensive platform for investment connections.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/investors/")({
  component: Investors,
});
