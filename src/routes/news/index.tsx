import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/news/")({
  component: News,
});

function News() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-20">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="py-16">
          <h1 className="text-4xl font-bold text-text-dark dark:text-text-light mb-8">
            News & Events
          </h1>
          <p className="text-lg text-text-dark/70 dark:text-text-light/70 mb-8">
            Stay updated with the latest news, events, and announcements from the Quantum Alliance community.
          </p>
          <div className="bg-neutral-light dark:bg-neutral-dark rounded-lg p-8 text-center">
            <p className="text-text-dark dark:text-text-light">
              News and events content coming soon. Follow us for the latest updates on innovation challenges and community events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
