import { useState } from "react";

interface StageProps {
  number: string;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}

function Stage({ number, title, description, isActive, onClick }: StageProps) {
  return (
    <div
      className={`cursor-pointer border-t border-text-light/20 py-8 transition-all ${
        isActive ? "border-secondary" : "hover:border-text-light/40"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className={`mr-6 text-2xl font-black ${isActive ? "text-secondary" : "text-text-light/40"}`}>
          {number}
        </div>
        <h3 className={`text-2xl font-bold ${isActive ? "text-text-light" : "text-text-light/70"}`}>
          {title}
        </h3>
      </div>
      
      {isActive && (
        <div className="mt-6 pl-12">
          <p className="text-lg text-text-light/80">
            {description}
          </p>
        </div>
      )}
    </div>
  );
}

export default function InnovationPipelineSection() {
  const [activeStage, setActiveStage] = useState(0);

  const stages = [
    {
      number: "01",
      title: "Problem Identification",
      description:
        "We work with governments and organizations to identify critical infrastructure challenges that need innovative solutions.",
    },
    {
      number: "02",
      title: "Innovation Sourcing",
      description:
        "We tap into our global network of innovators to find cutting-edge technologies and approaches to address these challenges.",
    },
    {
      number: "03",
      title: "Challenge Launch",
      description:
        "We design and launch structured innovation challenges with clear objectives, timelines, and prize incentives.",
    },
    {
      number: "04",
      title: "Pilot Execution",
      description:
        "Winners receive funding and support to pilot their solutions in real-world environments with our partners.",
    },
    {
      number: "05",
      title: "Global Scaling",
      description:
        "Successful pilots are scaled globally through our network of government and industry partners.",
    },
  ];

  return (
    <section
      id="pipeline"
      className="section-padding relative overflow-hidden bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="grid grid-cols-1 gap-24 lg:grid-cols-2">
          {/* Left column: Section header */}
          <div>
            <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-light md:text-6xl">
              Our Process
            </h2>
            <p className="mb-12 text-xl font-light text-text-light/80 md:text-2xl">
              From identifying critical challenges to scaling proven solutions globally, our structured approach transforms innovative ideas into real-world impact.
            </p>
            
            <div className="hidden lg:block">
              <div className="aspect-square overflow-hidden rounded-lg">
                <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center"></div>
              </div>
            </div>
          </div>
          
          {/* Right column: Interactive stages */}
          <div>
            <div className="mb-12">
              {stages.map((stage, index) => (
                <Stage
                  key={index}
                  number={stage.number}
                  title={stage.title}
                  description={stage.description}
                  isActive={activeStage === index}
                  onClick={() => setActiveStage(index)}
                />
              ))}
            </div>
            
            <a
              href="/challenges"
              className="inline-block rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light"
            >
              Current Challenges
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
