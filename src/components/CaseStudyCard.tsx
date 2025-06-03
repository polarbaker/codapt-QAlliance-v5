import { Badge } from "./ui/Badge";
import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { REGION_TAGS, YEAR_TAG_PATTERN } from "~/constants";
import { getImageUrl } from "~/utils";
import { useState } from "react";

export interface CaseStudyData {
  id: number;
  notionId: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  video: string | null;
  pdfUrl: string | null;
  tags: string;
  impactMetrics: string | null;
  featured: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date;
  parsedTags: string[];
  parsedImpactMetrics: Record<string, string>;
}

interface CaseStudyCardProps {
  caseStudy: CaseStudyData;
  onClick: (caseStudy: CaseStudyData) => void;
}

export default function CaseStudyCard({ caseStudy, onClick }: CaseStudyCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Get year tag if it exists
  const yearTag = caseStudy.parsedTags.find(tag => YEAR_TAG_PATTERN.test(tag));
  
  // Get region tag if it exists
  const regionTag = caseStudy.parsedTags.find(tag => REGION_TAGS.includes(tag as any));
  
  // Get other tags (excluding year and region)
  const otherTags = caseStudy.parsedTags.filter(tag => 
    !YEAR_TAG_PATTERN.test(tag) && !REGION_TAGS.includes(tag as any)
  );
  
  return (
    <div 
      className="group cursor-pointer overflow-hidden rounded-lg bg-background-black transition-all duration-300 hover:-translate-y-2 hover:shadow-xl flex flex-col h-full border border-neutral-dark/30"
      onClick={() => onClick(caseStudy)}
    >
      {/* Image with gradient overlay */}
      <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
        {imageError ? (
          <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
            <div className="text-center text-gray-400">
              <ImageIcon className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">Image unavailable</p>
            </div>
          </div>
        ) : (
          <>
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-secondary border-t-transparent"></div>
              </div>
            )}
            <div 
              className={`h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-110 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{ backgroundImage: `url(${getImageUrl(caseStudy.image)})` }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background-black via-background-black/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-300"></div>
          </>
        )}
        
        {/* Year Badge (if exists) */}
        {yearTag && (
          <div className="absolute top-4 right-4">
            <Badge color="accent" size="md">{yearTag}</Badge>
          </div>
        )}
        
        {/* Primary Tag Badge */}
        {otherTags.length > 0 && (
          <div className="absolute top-4 left-4">
            <Badge color="bg-background-black/70" size="md">{otherTags[0]}</Badge>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex flex-col flex-grow p-6">
        {regionTag && (
          <div className="mb-2 text-sm font-medium text-secondary">{regionTag}</div>
        )}
        <h3 className="mb-2 text-2xl font-bold text-text-light group-hover:text-secondary transition-colors duration-300">
          {caseStudy.title}
        </h3>
        <p className="mb-4 text-text-light/70">{caseStudy.summary}</p>
        
        <div className="mt-auto flex justify-between items-center">
          {/* Display first impact metric if available */}
          {Object.entries(caseStudy.parsedImpactMetrics)[0] && (
            <div className="text-sm font-medium text-secondary">
              {Object.entries(caseStudy.parsedImpactMetrics)[0][0]}: {Object.entries(caseStudy.parsedImpactMetrics)[0][1]}
            </div>
          )}
          <div className="text-sm text-text-light/50 flex items-center">
            <span className="inline-flex items-center rounded-full bg-secondary/20 px-4 py-1.5 hover:bg-secondary/30 transition-all duration-300 group-hover:bg-secondary group-hover:text-white">
              Read More
              <ArrowRight size={16} className="ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
