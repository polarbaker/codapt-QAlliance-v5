import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, FileText, Award, MapPin, Calendar, ExternalLink } from "lucide-react";
import { CaseStudyData } from "./CaseStudyCard";
import { Badge } from "./ui/Badge";
import { REGION_TAGS, YEAR_TAG_PATTERN } from "~/constants";

interface CaseStudyDetailModalProps {
  caseStudy: CaseStudyData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CaseStudyDetailModal({ 
  caseStudy, 
  isOpen, 
  onClose 
}: CaseStudyDetailModalProps) {
  if (!caseStudy) return null;
  
  // Get year tag if it exists
  const yearTag = caseStudy.parsedTags.find(tag => YEAR_TAG_PATTERN.test(tag));
  
  // Get region tag if it exists
  const regionTag = caseStudy.parsedTags.find(tag => REGION_TAGS.includes(tag as any));
  
  // Get other tags (excluding year and region)
  const otherTags = caseStudy.parsedTags.filter(tag => 
    !YEAR_TAG_PATTERN.test(tag) && !REGION_TAGS.includes(tag as any)
  );
  
  // Function to render YouTube video embed
  const renderVideoEmbed = () => {
    if (!caseStudy.video) return null;
    
    // Enhanced YouTube video ID extraction with support for more URL formats
    const getYouTubeId = (url: string) => {
      try {
        // Handle youtu.be short links
        if (url.includes('youtu.be')) {
          const id = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
          return id && id.length === 11 ? id : null;
        }
        
        // Handle regular youtube.com links
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        
        // Validate ID length
        const id = match && match[7].length === 11 ? match[7] : null;
        
        // Add logging for debugging
        if (!id) {
          console.warn('Invalid YouTube URL format:', url);
        }
        
        return id;
      } catch (error) {
        console.error('Error extracting YouTube ID:', error);
        return null;
      }
    };
    
    const videoId = getYouTubeId(caseStudy.video);
    
    if (!videoId) {
      return (
        <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg bg-neutral-dark/30 flex items-center justify-center">
          <p className="text-text-light/70">Video unavailable</p>
        </div>
      );
    }
    
    return (
      <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg shadow-lg">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}`}
          title={caseStudy.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="transition-all duration-300 hover:scale-[1.01]"
        ></iframe>
      </div>
    );
  };
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-background-black/95 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-xl bg-background-black border border-neutral-dark/30 p-8 text-left align-middle shadow-xl transition-all">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-3">
                    <Dialog.Title
                      as="h3"
                      className="text-3xl font-bold text-text-light"
                    >
                      {caseStudy.title}
                    </Dialog.Title>
                    {otherTags.length > 0 && (
                      <Badge color="secondary">{otherTags[0]}</Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-neutral-dark/50 p-2 text-text-light hover:bg-neutral-dark transition-colors duration-200 hover:rotate-90 transform"
                    onClick={onClose}
                    aria-label="Close modal"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                {/* Video or Image */}
                {caseStudy.video ? renderVideoEmbed() : (
                  <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg">
                    <div
                      className="h-full w-full bg-cover bg-center transition-all duration-500 hover:scale-105 transform"
                      style={{ backgroundImage: `url(${caseStudy.image})` }}
                    ></div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  {/* Main Content - left 2/3 */}
                  <div className="md:col-span-2 space-y-8">
                    <div>
                      <p className="text-xl text-text-light/80 mb-6 text-pretty">{caseStudy.summary}</p>
                      <h4 className="mb-4 text-xl font-bold text-text-light flex items-center">
                        <span className="inline-block mr-2 w-1 h-6 bg-secondary rounded-full"></span>
                        Case Details
                      </h4>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-text-light/80 whitespace-pre-line">{caseStudy.content}</p>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    {caseStudy.parsedTags.length > 0 && (
                      <div>
                        <h4 className="mb-4 text-xl font-bold text-text-light flex items-center">
                          <span className="inline-block mr-2 w-1 h-6 bg-secondary rounded-full"></span>
                          Categories
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {caseStudy.parsedTags.map((tag, index) => (
                            <Badge 
                              key={index} 
                              color={
                                YEAR_TAG_PATTERN.test(tag) ? "accent" :
                                REGION_TAGS.includes(tag as any) ? "primary" :
                                "secondary"
                              }
                              size="md"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Sidebar - right 1/3 */}
                  <div className="space-y-6">
                    {/* Impact Metrics */}
                    {Object.keys(caseStudy.parsedImpactMetrics).length > 0 && (
                      <div className="rounded-lg bg-secondary/10 border border-secondary/30 p-6 transition-all duration-300 hover:bg-secondary/15">
                        <h4 className="mb-4 flex items-center text-xl font-bold text-text-light">
                          <Award size={20} className="mr-2 text-secondary" />
                          Impact Metrics
                        </h4>
                        <div className="space-y-4">
                          {Object.entries(caseStudy.parsedImpactMetrics).map(([key, value], index) => (
                            <div key={index} className="flex items-center justify-between border-b border-neutral-dark/30 pb-3">
                              <span className="text-text-light/70">{key}:</span>
                              <span className="font-medium text-secondary">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Region & Year */}
                    <div className="rounded-lg bg-neutral-dark/20 p-6 transition-all duration-300 hover:bg-neutral-dark/30">
                      <h4 className="mb-4 text-lg font-bold text-text-light">Details</h4>
                      <div className="space-y-4">
                        {regionTag && (
                          <div className="flex items-center">
                            <div className="flex items-center">
                              <MapPin size={16} className="mr-2 text-secondary" />
                              <span className="text-text-light/70">Region:</span>
                            </div>
                            <Badge color="primary" size="md" className="ml-auto">{regionTag}</Badge>
                          </div>
                        )}
                        {yearTag && (
                          <div className="flex items-center">
                            <div className="flex items-center">
                              <Calendar size={16} className="mr-2 text-secondary" />
                              <span className="text-text-light/70">Year:</span>
                            </div>
                            <Badge color="accent" size="md" className="ml-auto">{yearTag}</Badge>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* PDF Download */}
                    {caseStudy.pdfUrl && (
                      <div className="text-center mt-6">
                        <a 
                          href={caseStudy.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-full bg-neutral-dark/50 px-6 py-4 text-text-light transition-all duration-300 hover:bg-neutral-dark hover:shadow-lg hover:scale-105"
                          aria-label="Download PDF report"
                        >
                          <FileText size={18} className="mr-2" />
                          Download PDF Report
                          <ExternalLink size={16} className="ml-2 opacity-70" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
