import { createFileRoute } from "@tanstack/react-router";

function CaseStudies() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-20">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="py-16">
          <h1 className="text-4xl font-bold text-text-dark dark:text-text-light mb-8">
            Case Studies
          </h1>
          <p className="text-lg text-text-dark/70 dark:text-text-light/70 mb-8">
            Explore real-world examples of innovation breakthroughs and success stories from our global network.
          </p>
          <div className="bg-neutral-light dark:bg-neutral-dark rounded-lg p-8 text-center">
            <p className="text-text-dark dark:text-text-light">
              Case studies content coming soon. We're working on showcasing the most impactful innovations from our community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/case-studies/")({
  component: CaseStudies,
});
