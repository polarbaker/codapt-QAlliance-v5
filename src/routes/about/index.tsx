import { createFileRoute } from "@tanstack/react-router";
import { Users, Target, Globe, Award, Lightbulb, Heart } from "lucide-react";

export const Route = createFileRoute("/about/")({
  component: About,
});

function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background-light via-background-light to-neutral-light/30 dark:from-background-black dark:via-background-black dark:to-neutral-dark/30 pt-28">
      {/* Hero Section */}
      <section className="section-padding relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-secondary/5 to-accent/5 dark:from-secondary/10 dark:to-accent/10"></div>
        <div className="mx-auto max-w-7xl container-padding relative">
          <div className="text-center mb-20">
            <h1 className="mb-8 text-6xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-7xl lg:text-8xl animate-fade-in">
              About <span className="bg-gradient-to-r from-secondary via-accent to-secondary bg-clip-text text-transparent animate-pulse">Quantum Alliance</span>
            </h1>
            <p className="mx-auto max-w-4xl text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl leading-relaxed animate-fade-in animation-delay-300">
              We are a global network of innovators, organizations, and visionaries united by a single mission: bridging the gap between breakthrough technology and real-world solutions.
            </p>
            <div className="mt-12 flex flex-wrap justify-center gap-4 animate-fade-in animation-delay-500">
              <a
                href="/challenges"
                className="btn btn-primary text-lg px-8 py-4"
              >
                Explore Our Work
              </a>
              <a
                href="#mission"
                className="btn btn-secondary text-lg px-8 py-4"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section id="mission" className="section-padding bg-gradient-to-r from-neutral-light/30 to-neutral-light/10 dark:from-neutral-dark/30 dark:to-neutral-dark/10">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="grid grid-cols-1 gap-20 lg:grid-cols-2 items-center">
            <div className="animate-fade-in">
              <div className="mb-8 flex items-center">
                <div className="mr-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20 animate-soft-pulse">
                  <Target className="h-8 w-8 text-secondary" />
                </div>
                <h2 className="text-4xl font-bold text-text-dark dark:text-text-light lg:text-5xl">Our Mission</h2>
              </div>
              <div className="space-y-6">
                <p className="text-lg text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                  To create structured innovation challenges that connect the world's most pressing problems with the brightest minds capable of solving them.
                </p>
                <p className="text-lg text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                  We believe that the greatest innovations happen when diverse perspectives collide with urgent needs. Our platform facilitates these connections, turning ideas into impact.
                </p>
                <div className="pt-4">
                  <a href="/challenges" className="inline-flex items-center text-secondary hover:text-accent transition-colors duration-300 font-medium">
                    See Our Challenges 
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </a>
                </div>
              </div>
            </div>
            
            <div className="animate-fade-in animation-delay-300">
              <div className="mb-8 flex items-center">
                <div className="mr-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 animate-soft-pulse animation-delay-150">
                  <Lightbulb className="h-8 w-8 text-accent" />
                </div>
                <h2 className="text-4xl font-bold text-text-dark dark:text-text-light lg:text-5xl">Our Vision</h2>
              </div>
              <div className="space-y-6">
                <p className="text-lg text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                  A world where breakthrough technologies reach the communities that need them most, where innovation serves humanity's greatest challenges.
                </p>
                <p className="text-lg text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                  We envision a future where the gap between laboratory breakthroughs and real-world deployment is measured in months, not decades.
                </p>
                <div className="pt-4">
                  <a href="/innovators" className="inline-flex items-center text-accent hover:text-secondary transition-colors duration-300 font-medium">
                    Meet Our Innovators 
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="section-padding relative">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="mb-20 text-center animate-fade-in">
            <h2 className="mb-8 text-5xl font-extrabold text-text-dark dark:text-text-light lg:text-6xl">Our Story</h2>
            <p className="mx-auto max-w-4xl text-xl text-text-dark/80 dark:text-text-light/80 leading-relaxed">
              Founded in 2020, Quantum Alliance emerged from a simple observation: the world's most brilliant innovations often never reach the people who need them most.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            <div className="text-center group animate-fade-in">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-secondary/20 to-secondary/30 group-hover:from-secondary/30 group-hover:to-secondary/40 transition-all duration-300 animate-float">
                <Users className="h-10 w-10 text-secondary" />
              </div>
              <h3 className="mb-6 text-2xl font-bold text-text-dark dark:text-text-light">2020: Foundation</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                Started with a team of 5 passionate engineers and social entrepreneurs who believed technology could solve humanity's greatest challenges.
              </p>
            </div>
            
            <div className="text-center group animate-fade-in animation-delay-300">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent/30 group-hover:from-accent/30 group-hover:to-accent/40 transition-all duration-300 animate-float animation-delay-150">
                <Globe className="h-10 w-10 text-accent" />
              </div>
              <h3 className="mb-6 text-2xl font-bold text-text-dark dark:text-text-light">2022: Global Expansion</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                Expanded to 6 continents, launching our first major challenges in climate technology, digital infrastructure, and healthcare innovation.
              </p>
            </div>
            
            <div className="text-center group animate-fade-in animation-delay-500">
              <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-secondary/20 to-accent/20 group-hover:from-secondary/30 group-hover:to-accent/30 transition-all duration-300 animate-float animation-delay-300">
                <Award className="h-10 w-10 text-secondary" />
              </div>
              <h3 className="mb-6 text-2xl font-bold text-text-dark dark:text-text-light">2024: Impact at Scale</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                Our innovators have raised over $350M in funding and deployed solutions that impact millions of lives across the globe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="section-padding bg-gradient-to-r from-neutral-light/30 to-neutral-light/10 dark:from-neutral-dark/30 dark:to-neutral-dark/10">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="mb-20 text-center animate-fade-in">
            <h2 className="mb-8 text-5xl font-extrabold text-text-dark dark:text-text-light lg:text-6xl">Our Values</h2>
            <p className="mx-auto max-w-4xl text-xl text-text-dark/80 dark:text-text-light/80 leading-relaxed">
              These principles guide everything we do, from how we structure challenges to how we support our innovators.
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="group rounded-2xl bg-background-light dark:bg-background-black p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-neutral-light/50 dark:border-neutral-dark/50 animate-fade-in">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 group-hover:bg-secondary/30 transition-colors duration-300">
                <Heart className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Impact First</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                Every innovation we support must have the potential to meaningfully improve lives, especially for underserved communities.
              </p>
            </div>
            
            <div className="group rounded-2xl bg-background-light dark:bg-background-black p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-neutral-light/50 dark:border-neutral-dark/50 animate-fade-in animation-delay-150">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 group-hover:bg-accent/30 transition-colors duration-300">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Global Perspective</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                We believe the best solutions come from diverse teams working across cultural and geographic boundaries.
              </p>
            </div>
            
            <div className="group rounded-2xl bg-background-light dark:bg-background-black p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-neutral-light/50 dark:border-neutral-dark/50 animate-fade-in animation-delay-300">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 group-hover:bg-secondary/30 transition-colors duration-300">
                <Target className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Measurable Outcomes</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                We track real-world impact, not just technological advancement. Success is measured in lives improved, not just patents filed.
              </p>
            </div>
            
            <div className="group rounded-2xl bg-background-light dark:bg-background-black p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-neutral-light/50 dark:border-neutral-dark/50 animate-fade-in animation-delay-150">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 group-hover:bg-accent/30 transition-colors duration-300">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Collaborative Innovation</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                The biggest challenges require collective intelligence. We foster collaboration over competition.
              </p>
            </div>
            
            <div className="group rounded-2xl bg-background-light dark:bg-background-black p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-neutral-light/50 dark:border-neutral-dark/50 animate-fade-in animation-delay-300">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20 group-hover:bg-secondary/30 transition-colors duration-300">
                <Lightbulb className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Open Innovation</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                Knowledge should be shared. We promote open-source solutions and transparent development processes.
              </p>
            </div>
            
            <div className="group rounded-2xl bg-background-light dark:bg-background-black p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border border-neutral-light/50 dark:border-neutral-dark/50 animate-fade-in animation-delay-500">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 group-hover:bg-accent/30 transition-colors duration-300">
                <Award className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-4 text-xl font-bold text-text-dark dark:text-text-light">Excellence in Execution</h3>
              <p className="text-text-dark/80 dark:text-text-light/80 leading-relaxed">
                Great ideas need great execution. We provide the support, resources, and networks to turn concepts into reality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="section-padding">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-secondary via-accent to-secondary p-12 text-center text-white shadow-2xl animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 to-accent/90"></div>
            <div className="relative">
              <h2 className="mb-6 text-4xl font-bold lg:text-5xl">Join Our Mission</h2>
              <p className="mb-10 text-xl opacity-90 max-w-3xl mx-auto leading-relaxed">
                Whether you're an innovator, organization, or investor, there's a place for you in the Quantum Alliance.
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                <a
                  href="/challenges"
                  className="group rounded-full bg-white px-10 py-4 font-semibold text-secondary transition-all hover:bg-gray-100 hover:scale-105 active:scale-95 shadow-lg"
                >
                  <span className="flex items-center">
                    Explore Challenges
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </a>
                <a
                  href="/apply"
                  className="group rounded-full border-2 border-white bg-transparent px-10 py-4 font-semibold text-white transition-all hover:bg-white hover:text-secondary hover:scale-105 active:scale-95 shadow-lg"
                >
                  <span className="flex items-center">
                    Apply as Innovator
                    <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
