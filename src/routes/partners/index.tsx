import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/partners/")({
  component: Partners,
});

function Partners() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-20">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="py-16">
          <h1 className="text-4xl font-bold text-text-dark dark:text-text-light mb-8">
            Partners
          </h1>
          <p className="text-lg text-text-dark/70 dark:text-text-light/70 mb-8">
            Meet our global network of partners who help drive innovation and support breakthrough solutions.
          </p>
          <div className="bg-neutral-light dark:bg-neutral-dark rounded-lg p-8 text-center">
            <p className="text-text-dark dark:text-text-light">
              Partner information coming soon. We're showcasing our diverse ecosystem of collaborators and supporters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
