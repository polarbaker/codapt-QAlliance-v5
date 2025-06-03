import { createFileRoute } from "@tanstack/react-router";
import { Users, Target, Globe, Award, Lightbulb, Heart } from "lucide-react";

export const Route = createFileRoute("/about/")({
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-24">
      {/* Hero Section */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="text-center mb-16">
            <h1 className="mb-8 text-6xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-7xl">
              About <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">Quantum Alliance</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
              We are a global network of innovators, organizations, and visionaries united by a single mission: bridging the gap between breakthrough technology and real-world solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding bg-neutral-light/20 dark:bg-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            <div>
              <div className="mb-6 flex items-center">
                <Target className="mr-4 h-8 w-8 text-secondary" />
                <h2 className="text-4xl font-bold text-text-dark dark:text-text-light">Our Mission</h2>
              </div>
              <p className="mb-6 text-lg text-text-dark/80 dark:text-text-light/80">
                To create structured innovation challenges that connect the world's most pressing problems with the brightest minds capable of solving them.
              </p>
              <p className="text-lg text-text-dark/80 dark:text-text-light/80">
                We believe that the greatest innovations happen when diverse perspectives collide with urgent needs. Our platform facilitates these connections, turning ideas into impact.
              </p>
            </div>
            
            <div>
              <div className="mb-6 flex items-center">
                <Lightbulb className="mr-4 h-8 w-8 text-secondary" />
                <h2 className="text-4xl font-bold text-text-dark dark:text-text-light">Our Vision</h2>
              </div>
              <p className="mb-6 text-lg text-text-dark/80 dark:text-text-light/80">
                A world where breakthrough technologies reach the communities that need them most, where innovation serves humanity's greatest challenges.
              </p>
              <p className="text-lg text-text-dark/80 dark:text-text-light/80">
                We envision a future where the gap between laboratory breakthroughs and real-world deployment is measured in months, not decades.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="mb-16 text-center">
            <h2 className="mb-8 text-5xl font-extrabold text-text-dark dark:text-text-light">Our Story</h2>
            <p className="mx-auto max-w-3xl text-xl text-text-dark/80 dark:text-text-light/80">
              Founded in 2020, Quantum Alliance emerged from a simple observation: the world's most brilliant innovations often never reach the people who need them most.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                <Users className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-text-dark dark:text-text-light">2020: Foundation</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Started with a team of 5 passionate engineers and social entrepreneurs who believed technology could solve humanity's greatest challenges.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                <Globe className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-text-dark dark:text-text-light">2022: Global Expansion</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Expanded to 6 continents, launching our first major challenges in climate technology, digital infrastructure, and healthcare innovation.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
                <Award className="h-8 w-8 text-secondary" />
              </div>
              <h3 className="mb-4 text-2xl font-bold text-text-dark dark:text-text-light">2024: Impact at Scale</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Our innovators have raised over $350M in funding and deployed solutions that impact millions of lives across the globe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="section-padding bg-neutral-light/20 dark:bg-neutral-dark/20">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="mb-16 text-center">
            <h2 className="mb-8 text-5xl font-extrabold text-text-dark dark:text-text-light">Our Values</h2>
            <p className="mx-auto max-w-3xl text-xl text-text-dark/80 dark:text-text-light/80">
              These principles guide everything we do, from how we structure challenges to how we support our innovators.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <Heart className="mb-4 h-8 w-8 text-secondary" />
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Impact First</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Every innovation we support must have the potential to meaningfully improve lives, especially for underserved communities.
              </p>
            </div>
            
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <Globe className="mb-4 h-8 w-8 text-secondary" />
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Global Perspective</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                We believe the best solutions come from diverse teams working across cultural and geographic boundaries.
              </p>
            </div>
            
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <Target className="mb-4 h-8 w-8 text-secondary" />
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Measurable Outcomes</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                We track real-world impact, not just technological advancement. Success is measured in lives improved, not just patents filed.
              </p>
            </div>
            
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <Users className="mb-4 h-8 w-8 text-secondary" />
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Collaborative Innovation</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                The biggest challenges require collective intelligence. We foster collaboration over competition.
              </p>
            </div>
            
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <Lightbulb className="mb-4 h-8 w-8 text-secondary" />
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Open Innovation</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Knowledge should be shared. We promote open-source solutions and transparent development processes.
              </p>
            </div>
            
            <div className="rounded-lg bg-background-light dark:bg-background-black p-8">
              <Award className="mb-4 h-8 w-8 text-secondary" />
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Excellence in Execution</h3>
              <p className="text-text-dark/80 dark:text-text-light/80">
                Great ideas need great execution. We provide the support, resources, and networks to turn concepts into reality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="rounded-2xl bg-gradient-to-r from-secondary to-accent p-12 text-center text-white">
            <h2 className="mb-6 text-4xl font-bold">Join Our Mission</h2>
            <p className="mb-8 text-xl opacity-90">
              Whether you're an innovator, organization, or investor, there's a place for you in the Quantum Alliance.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/challenges"
                className="rounded-full bg-white px-8 py-4 font-medium text-secondary transition-all hover:bg-gray-100"
              >
                Explore Challenges
              </a>
              <a
                href="/apply"
                className="rounded-full border-2 border-white bg-transparent px-8 py-4 font-medium text-white transition-all hover:bg-white hover:text-secondary"
              >
                Apply as Innovator
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
