import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Calendar, Award, Users, Check, ArrowRight, Clock } from "lucide-react";
import { ChallengeData } from "./ChallengeCard";
import { Badge } from "./ui/Badge";

interface ChallengeDetailModalProps {
  challenge: ChallengeData | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChallengeDetailModal({ 
  challenge, 
  isOpen, 
  onClose 
}: ChallengeDetailModalProps) {
  if (!challenge) return null;
  
  // Format dates
  const formatDate = (date: Date | null) => {
    if (!date) return "TBA";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  // Get status badge color
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
                      {challenge.title}
                    </Dialog.Title>
                    <Badge color={getStatusColor(challenge.status)}>{challenge.status}</Badge>
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
                
                {/* Hero Image */}
                <div className="mb-8 aspect-video w-full overflow-hidden rounded-lg">
                  <div
                    className="h-full w-full bg-cover bg-center transition-all duration-500 hover:scale-105 transform"
                    style={{ backgroundImage: `url(${challenge.image})` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                  {/* Main Content - left 2/3 */}
                  <div className="md:col-span-2 space-y-8">
                    <div>
                      <p className="text-xl text-text-light/80 mb-6 text-pretty">{challenge.tagline}</p>
                      <h4 className="mb-4 text-xl font-bold text-text-light flex items-center">
                        <span className="inline-block mr-2 w-1 h-6 bg-secondary rounded-full"></span>
                        Overview
                      </h4>
                      <div className="prose prose-invert max-w-none">
                        <p className="text-text-light/80 whitespace-pre-line">{challenge.description}</p>
                      </div>
                    </div>
                    
                    {/* Timeline */}
                    <div>
                      <h4 className="mb-4 text-xl font-bold text-text-light flex items-center">
                        <Calendar size={20} className="mr-2 text-secondary" />
                        Challenge Timeline
                      </h4>
                      <div className="space-y-4 bg-neutral-dark/20 rounded-lg p-4">
                        <div className="flex items-center border-b border-neutral-dark/30 pb-3">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                              <Clock size={18} className="text-secondary" />
                            </div>
                          </div>
                          <div className="flex-grow">
                            <div className="text-sm text-text-light/60">Submissions Open</div>
                            <div className="font-medium text-text-light">{formatDate(challenge.openDate)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center border-b border-neutral-dark/30 pb-3">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                              <Clock size={18} className="text-secondary" />
                            </div>
                          </div>
                          <div className="flex-grow">
                            <div className="text-sm text-text-light/60">Submissions Close</div>
                            <div className="font-medium text-text-light">{formatDate(challenge.closeDate)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <div className="flex-shrink-0 mr-3">
                            <div className="h-10 w-10 rounded-full bg-secondary/20 flex items-center justify-center">
                              <Clock size={18} className="text-secondary" />
                            </div>
                          </div>
                          <div className="flex-grow">
                            <div className="text-sm text-text-light/60">Pilot Start</div>
                            <div className="font-medium text-text-light">{formatDate(challenge.pilotStartDate)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Eligibility */}
                    {challenge.eligibility && (
                      <div>
                        <h4 className="mb-4 text-xl font-bold text-text-light flex items-center">
                          <Check size={20} className="mr-2 text-secondary" />
                          Eligibility Criteria
                        </h4>
                        <div className="bg-neutral-dark/20 rounded-lg p-4">
                          <p className="text-text-light/80 whitespace-pre-line">{challenge.eligibility}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Sidebar - right 1/3 */}
                  <div className="space-y-6">
                    {/* Prize Info */}
                    <div className="rounded-lg bg-secondary/10 border border-secondary/30 p-6 transition-all duration-300 hover:bg-secondary/15">
                      <h4 className="mb-3 flex items-center text-xl font-bold text-text-light">
                        <Award size={20} className="mr-2 text-secondary" />
                        Prize
                      </h4>
                      <p className="text-2xl font-bold text-secondary">{challenge.prize}</p>
                    </div>
                    
                    {/* Category & Region */}
                    <div className="rounded-lg bg-neutral-dark/20 p-6 transition-all duration-300 hover:bg-neutral-dark/30">
                      <h4 className="mb-4 text-lg font-bold text-text-light">Details</h4>
                      <div className="space-y-4">
                        <div className="flex items-center">
                          <span className="text-text-light/70 min-w-24">Category:</span>
                          <Badge color="bg-neutral-dark/50" size="md" className="ml-auto">{challenge.category}</Badge>
                        </div>
                        <div className="flex items-center">
                          <span className="text-text-light/70 min-w-24">Region:</span>
                          <Badge color="bg-neutral-dark/50" size="md" className="ml-auto">{challenge.region}</Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Partners */}
                    {challenge.parsedPartners && challenge.parsedPartners.length > 0 && (
                      <div className="rounded-lg bg-neutral-dark/20 p-6 transition-all duration-300 hover:bg-neutral-dark/30">
                        <h4 className="mb-4 flex items-center text-xl font-bold text-text-light">
                          <Users size={20} className="mr-2 text-secondary" />
                          Partners
                        </h4>
                        <div className="space-y-4">
                          {challenge.parsedPartners.map((partner, index) => (
                            <div key={index} className="flex items-center bg-neutral-dark/30 p-3 rounded-lg">
                              {partner.logo ? (
                                <img 
                                  src={partner.logo} 
                                  alt={partner.name} 
                                  className="mr-3 h-8 w-auto"
                                />
                              ) : null}
                              <span className="text-text-light/80">{partner.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* CTA Button */}
                    <div className="text-center mt-6">
                      <button 
                        className="w-full rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all duration-300 hover:bg-secondary-light hover:shadow-lg hover:scale-105 flex items-center justify-center"
                        onClick={() => {
                          // Close the modal
                          onClose();
                          // Scroll to the submit section
                          document.getElementById('submit')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        Apply Now
                        <ArrowRight size={18} className="ml-2" />
                      </button>
                    </div>
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
