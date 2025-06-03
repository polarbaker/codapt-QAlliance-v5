import { useState } from "react";
import toast from "react-hot-toast";
import { Building } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { getCacheBustedImageUrl } from "~/utils";

export default function AboutSection() {
  const trpc = useTRPC();
  
  // Fetch partners data
  const { data: partnersData, isLoading: isLoadingPartners, error: partnersError } = useQuery(
    trpc.getPartners.queryOptions()
  );

  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [imageLoading, setImageLoading] = useState<Set<number>>(new Set());

  const handleImageError = (partnerId: number) => {
    setImageErrors(prev => new Set(prev).add(partnerId));
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(partnerId);
      return newSet;
    });
  };

  const handleImageLoad = (partnerId: number) => {
    setImageErrors(prev => {
      const newSet = new Set(prev);
      newSet.delete(partnerId);
      return newSet;
    });
    setImageLoading(prev => {
      const newSet = new Set(prev);
      newSet.delete(partnerId);
      return newSet;
    });
  };

  const handleImageLoadStart = (partnerId: number) => {
    setImageLoading(prev => new Set(prev).add(partnerId));
  };

  return (
    <section
      id="about"
      className="section-padding relative overflow-hidden bg-background-light dark:bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        {/* Section header */}
        <div className="mb-24 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-dark dark:text-text-light md:text-6xl">
            Who We Are
          </h2>
          <p className="text-xl font-light text-text-dark/80 dark:text-text-light/80 md:text-2xl">
            Quantum Alliance bridges innovation gaps by connecting frontier technology with real-world problems.
          </p>
        </div>

        {/* Main content in a full-width layout */}
        <div className="mb-24 grid grid-cols-1 gap-24 lg:grid-cols-2">
          {/* Left column: Mission & Vision */}
          <div>
            <div className="mb-12">
              <h3 className="mb-6 text-3xl font-bold text-text-dark dark:text-text-light">
                Our Mission
              </h3>
              <p className="mb-8 text-lg text-text-dark/80 dark:text-text-light/80">
                We create structured challenges to address global needs in climate, digital infrastructure, and more. Our approach connects innovators directly with the organizations and governments that need their solutions most.
              </p>
              <p className="text-lg text-text-dark/80 dark:text-text-light/80">
                By focusing on real-world implementation and scale, we ensure that breakthrough technologies don't just remain interesting ideas, but become transformative solutions deployed where they're needed most.
              </p>
            </div>

            <div>
              <h3 className="mb-6 text-3xl font-bold text-text-dark dark:text-text-light">
                Our Approach
              </h3>
              <ul className="space-y-4 text-lg text-text-dark/80 dark:text-text-light/80">
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">01</span>
                  <span>Identify critical infrastructure challenges with global partners</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">02</span>
                  <span>Source innovative solutions from our global network</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">03</span>
                  <span>Structure challenges with clear objectives and incentives</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">04</span>
                  <span>Support pilot implementations in real-world environments</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-4 mt-1 text-xl font-bold text-secondary">05</span>
                  <span>Scale successful solutions through our global network</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right column: Video and Partners */}
          <div>
            {/* Video Section */}
            <div className="mb-12 aspect-video overflow-hidden rounded-lg">
              <div className="relative h-full w-full bg-[url('https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80')] bg-cover bg-center">
                <div className="absolute inset-0 bg-gradient-to-t from-background-black to-transparent opacity-60"></div>
                <div className="flex h-full w-full items-center justify-center">
                  <button 
                    onClick={() => toast.info("Video preview coming soon! Check back later for our story.")}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-white transition-transform hover:scale-110"
                    aria-label="Play video about Quantum Alliance's story"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background-black to-transparent p-6">
                  <h4 className="text-xl font-bold text-text-light">
                    Our Story: From Concept to Global Impact
                  </h4>
                  <p className="mt-2 text-sm text-text-light/80">
                    Learn how Quantum Alliance is transforming the way we solve global challenges through structured innovation.
                  </p>
                </div>
              </div>
            </div>

            {/* Partners Section */}
            <div>
              <h3 className="mb-6 text-2xl font-bold text-text-dark dark:text-text-light">
                Our Partners
              </h3>
              {isLoadingPartners ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : partnersError ? (
                <div className="rounded-lg bg-red-50 p-4 text-center text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <p className="font-medium">Failed to load partners</p>
                  <p className="text-sm mt-1">Please try again later.</p>
                </div>
              ) : partnersData?.partners && partnersData.partners.length > 0 ? (
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-center justify-items-center"
                  aria-label="Partner Logos"
                >
                  {partnersData.partners.map((partner) => (
                    <div key={partner.id} className="flex items-center justify-center relative">
                      {imageErrors.has(partner.id) ? (
                        <div className="h-[60px] w-24 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center">
                          <Building className="h-8 w-8 text-gray-400" />
                        </div>
                      ) : (
                        <div className="relative">
                          {imageLoading.has(partner.id) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                            </div>
                          )}
                          {partner.websiteUrl ? (
                            <a 
                              href={partner.websiteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="transition-all hover:opacity-80 hover:scale-105 block"
                              title={`Visit ${partner.name} website`}
                            >
                              <img 
                                src={getCacheBustedImageUrl(partner.logoUrl, partner.updatedAt)} 
                                alt={partner.altText} 
                                className={`max-h-[60px] max-w-full w-auto h-auto object-contain grayscale hover:grayscale-0 transition-all ${
                                  imageLoading.has(partner.id) ? 'opacity-0' : 'opacity-100'
                                }`}
                                onError={() => handleImageError(partner.id)}
                                onLoad={() => handleImageLoad(partner.id)}
                                onLoadStart={() => handleImageLoadStart(partner.id)}
                                loading="lazy"
                              />
                            </a>
                          ) : (
                            <img 
                              src={getCacheBustedImageUrl(partner.logoUrl, partner.updatedAt)} 
                              alt={partner.altText} 
                              className={`max-h-[60px] max-w-full w-auto h-auto object-contain grayscale transition-all ${
                                imageLoading.has(partner.id) ? 'opacity-0' : 'opacity-100'
                              }`}
                              onError={() => handleImageError(partner.id)}
                              onLoad={() => handleImageLoad(partner.id)}
                              onLoadStart={() => handleImageLoadStart(partner.id)}
                              loading="lazy"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-text-dark/60 dark:text-text-light/60">
                  <Building className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No partners available at the moment.</p>
                  <p className="text-sm mt-1">Check back soon for updates.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="flex justify-center">
          <a
            href="#pipeline"
            className="inline-block rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Explore Our Process
          </a>
        </div>
      </div>
    </section>
  );
}
