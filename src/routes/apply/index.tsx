import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/apply/")({
  component: Apply,
});

function Apply() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-20">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="py-16">
          <h1 className="text-4xl font-bold text-text-dark dark:text-text-light mb-8">
            Apply
          </h1>
          <p className="text-lg text-text-dark/70 dark:text-text-light/70 mb-8">
            Join our community of innovators and apply to participate in our challenges and programs.
          </p>
          <div className="bg-neutral-light dark:bg-neutral-dark rounded-lg p-8 text-center">
            <p className="text-text-dark dark:text-text-light">
              Application process coming soon. We're developing a comprehensive application system for innovators and entrepreneurs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
