import { useState } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useBulkSiteContentText } from "~/hooks/useSiteContentText";

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
  const trpc = useTRPC();
  
  // Fetch innovation pipeline text content
  const { texts: pipelineTexts } = useBulkSiteContentText([
    'pipeline_title',
    'pipeline_description',
    'pipeline_stage1_title',
    'pipeline_stage1_description',
    'pipeline_stage2_title',
    'pipeline_stage2_description',
    'pipeline_stage3_title',
    'pipeline_stage3_description',
    'pipeline_stage4_title',
    'pipeline_stage4_description',
    'pipeline_stage5_title',
    'pipeline_stage5_description',
    'pipeline_button_text',
  ]);
  
  // Fetch innovation pipeline image from database
  const pipelineImageQuery = useQuery(
    trpc.getSiteContentImage.queryOptions({
      imageType: 'innovation_pipeline_image',
    })
  );

  // Use database image if available, otherwise fall back to hardcoded URL
  const getPipelineImageUrl = () => {
    if (pipelineImageQuery.data?.hasImage && pipelineImageQuery.data?.imageData) {
      return pipelineImageQuery.data.imageData;
    }
    return 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80';
  };

  const pipelineImageUrl = getPipelineImageUrl();

  const stages = [
    {
      number: "01",
      title: pipelineTexts.pipeline_stage1_title,
      description: pipelineTexts.pipeline_stage1_description,
    },
    {
      number: "02",
      title: pipelineTexts.pipeline_stage2_title,
      description: pipelineTexts.pipeline_stage2_description,
    },
    {
      number: "03",
      title: pipelineTexts.pipeline_stage3_title,
      description: pipelineTexts.pipeline_stage3_description,
    },
    {
      number: "04",
      title: pipelineTexts.pipeline_stage4_title,
      description: pipelineTexts.pipeline_stage4_description,
    },
    {
      number: "05",
      title: pipelineTexts.pipeline_stage5_title,
      description: pipelineTexts.pipeline_stage5_description,
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
              {pipelineTexts.pipeline_title}
            </h2>
            <p className="mb-12 text-xl font-light text-text-light/80 md:text-2xl">
              {pipelineTexts.pipeline_description}
            </p>
            
            <div className="hidden lg:block">
              <div className="aspect-square overflow-hidden rounded-lg">
                <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url('${pipelineImageUrl}')` }}></div>
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
              {pipelineTexts.pipeline_button_text}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
