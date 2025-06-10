import { Badge } from "./ui/Badge";
import { ArrowRight, Image as ImageIcon } from "lucide-react";
import { getImageUrl } from "~/utils/common";
import { useState } from "react";

export interface ChallengeData {
  id: number;
  title: string;
  tagline: string;
  category: string;
  region: string;
  status: string;
  image: string;
  description: string;
  prize: string;
  openDate: Date | null;
  closeDate: Date | null;
  pilotStartDate: Date | null;
  partners: string | null;
  eligibility: string | null;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
  order: number;
  parsedPartners?: any[];
}

interface ChallengeCardProps {
  challenge: ChallengeData;
  onClick: (challenge: ChallengeData) => void;
}

export default function ChallengeCard({ challenge, onClick }: ChallengeCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Generate status badge color based on status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'submissions open':
        return 'secondary';
      case 'coming soon':
        return 'accent';
      default:
        return 'neutral';
    }
  };

  return (
    <div 
      className="group cursor-pointer overflow-hidden rounded-lg bg-background-black transition-all duration-300 hover:-translate-y-2 hover:shadow-xl flex flex-col h-full border border-neutral-dark/30 animate-fadeIn"
      onClick={() => onClick(challenge)}
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
            <img
              src={getImageUrl(challenge.image)}
              alt={challenge.title}
              className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-110 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background-black via-background-black/40 to-transparent opacity-80 group-hover:opacity-70 transition-opacity duration-300"></div>
          </>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-4 right-4">
          <Badge color={getStatusColor(challenge.status)} size="md">{challenge.status}</Badge>
        </div>
        
        {/* Category Badge */}
        <div className="absolute top-4 left-4">
          <Badge color="bg-background-black/70" size="md">{challenge.category}</Badge>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex flex-col flex-grow p-6">
        <div className="mb-2 text-sm font-medium text-secondary">{challenge.region}</div>
        <h3 className="mb-2 text-2xl font-bold text-text-light group-hover:text-secondary transition-colors duration-300">
          {challenge.title}
        </h3>
        <p className="mb-4 text-text-light/70">{challenge.tagline}</p>
        
        <div className="mt-auto flex justify-between items-center">
          <div className="text-lg font-bold text-secondary">{challenge.prize}</div>
          <div className="text-sm text-text-light/50 flex items-center">
            <span className="inline-flex items-center rounded-full bg-secondary/20 px-4 py-1.5 hover:bg-secondary/30 transition-all duration-300 group-hover:bg-secondary group-hover:text-white">
              Learn More
              <ArrowRight size={16} className="ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
