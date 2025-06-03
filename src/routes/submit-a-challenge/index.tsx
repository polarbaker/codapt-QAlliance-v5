import { createFileRoute } from "@tanstack/react-router";
import ProblemSubmissionSection from "~/components/ProblemSubmissionSection";
import { Lightbulb, Users, Target, Award } from "lucide-react";

export const Route = createFileRoute("/submit-a-challenge/")({
  component: SubmitChallenge,
});

function SubmitChallenge() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-24">
      {/* Hero Section */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center mb-16">
            <h1 className="mb-8 text-6xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-7xl">
              Submit a <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Challenge</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
              Have a problem that needs innovative solutions? Submit your challenge to our global network of innovators and watch breakthrough ideas come to life.
            </p>
          </div>
        </div>
      </section>

      {/* Why Submit Section */}
      <section className="section-padding bg-neutral-light/20 dark:bg-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="mb-16 text-center">
            <h2 className="mb-8 text-4xl font-bold text-text-dark dark:text-text-light">
              Why Submit Your Challenge?
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-text-dark/80 dark:text-text-light/80">
              When you submit a challenge to Quantum Alliance, you're tapping into a global ecosystem of innovation and expertise.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Global Reach</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Access innovators from 6 continents with diverse expertise and perspectives.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                <Lightbulb className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Expert Solutions</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Get solutions from proven innovators who have scaled technologies globally.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                <Target className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Structured Process</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Our proven methodology ensures solutions are practical and implementable.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                <Award className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Proven Results</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Our challenges have led to $350M+ in funding and millions of lives impacted.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Challenge Submission Form */}
      <ProblemSubmissionSection />

      {/* Success Stories */}
      <section className="section-padding bg-neutral-light/20 dark:bg-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="mb-16 text-center">
            <h2 className="mb-8 text-4xl font-bold text-text-dark dark:text-text-light">
              Challenge Success Stories
            </h2>
            <p className="mx-auto max-w-3xl text-lg text-text-dark/80 dark:text-text-light/80">
              See how organizations like yours have found breakthrough solutions through our platform.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <div className="mb-4 h-2 w-16 bg-secondary rounded"></div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">
                Clean Water Access
              </h3>
              <p className="mb-6 text-text-dark/80 dark:text-text-light/80">
                "Our water purification challenge attracted 200+ submissions and resulted in a solution now serving 50,000 people across rural Africa."
              </p>
              <div className="flex items-center">
                <div className="mr-3 h-10 w-10 rounded-full bg-secondary"></div>
                <div>
                  <p className="font-medium text-text-dark dark:text-text-light">Sarah Williams</p>
                  <p className="text-sm text-text-dark/60 dark:text-text-light/60">Water Aid International</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <div className="mb-4 h-2 w-16 bg-secondary rounded"></div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">
                Digital Education
              </h3>
              <p className="mb-6 text-text-dark/80 dark:text-text-light/80">
                "The innovative learning platform developed through our challenge now reaches 100,000 students in remote areas."
              </p>
              <div className="flex items-center">
                <div className="mr-3 h-10 w-10 rounded-full bg-accent"></div>
                <div>
                  <p className="font-medium text-text-dark dark:text-text-light">Carlos Rodriguez</p>
                  <p className="text-sm text-text-dark/60 dark:text-text-light/60">Education For All</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <div className="mb-4 h-2 w-16 bg-secondary rounded"></div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">
                Sustainable Agriculture
              </h3>
              <p className="mb-6 text-text-dark/80 dark:text-text-light/80">
                "The drought-resistant farming techniques from our challenge increased crop yields by 40% for 25,000 farmers."
              </p>
              <div className="flex items-center">
                <div className="mr-3 h-10 w-10 rounded-full bg-tech-forest"></div>
                <div>
                  <p className="font-medium text-text-dark dark:text-text-light">Dr. Priya Sharma</p>
                  <p className="text-sm text-text-dark/60 dark:text-text-light/60">AgriTech Solutions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="rounded-2xl bg-gradient-to-r from-secondary to-accent p-12 text-center text-white">
            <h2 className="mb-6 text-4xl font-bold">What Happens Next?</h2>
            <div className="mx-auto max-w-4xl">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div>
                  <div className="mb-4 text-3xl font-bold">1</div>
                  <h3 className="mb-2 text-xl font-semibold">Review & Refinement</h3>
                  <p className="opacity-90">
                    Our experts review your submission and work with you to refine the challenge parameters.
                  </p>
                </div>
                <div>
                  <div className="mb-4 text-3xl font-bold">2</div>
                  <h3 className="mb-2 text-xl font-semibold">Launch & Promotion</h3>
                  <p className="opacity-90">
                    We launch your challenge to our global network and promote it across our channels.
                  </p>
                </div>
                <div>
                  <div className="mb-4 text-3xl font-bold">3</div>
                  <h3 className="mb-2 text-xl font-semibold">Solution & Implementation</h3>
                  <p className="opacity-90">
                    We help you evaluate submissions and support the implementation of winning solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
