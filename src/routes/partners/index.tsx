import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building, ExternalLink } from "lucide-react";
import { useTRPC } from "~/trpc/react";
import { getCacheBustedImageUrl } from "~/utils/common";

export const Route = createFileRoute("/partners/")({
  component: Partners,
});

function Partners() {
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
    <div className="min-h-screen bg-background-light dark:bg-background-black pt-20">
      <div className="container-padding mx-auto max-w-7xl">
        <div className="py-16">
          {/* Page Header */}
          <div className="mb-16 text-center">
            <h1 className="text-4xl font-bold text-text-dark dark:text-text-light mb-6 md:text-5xl">
              Our Partners
            </h1>
            <p className="text-lg text-text-dark/70 dark:text-text-light/70 mb-4 max-w-3xl mx-auto md:text-xl">
              Meet our global network of partners who help drive innovation and support breakthrough solutions. 
              Together, we're building a future where technology serves humanity's greatest challenges.
            </p>
            <p className="text-base text-text-dark/60 dark:text-text-light/60 max-w-2xl mx-auto">
              From governments and corporations to research institutions and NGOs, our diverse ecosystem 
              of collaborators enables us to scale innovative solutions worldwide.
            </p>
          </div>

          {/* Partners Grid */}
          <div className="mb-16">
            {isLoadingPartners ? (
              <div className="flex justify-center py-16">
                <div className="text-center">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
                  <p className="text-text-dark/60 dark:text-text-light/60">Loading our partners...</p>
                </div>
              </div>
            ) : partnersError ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-8 text-center">
                <div className="text-red-600 dark:text-red-400 mb-4">
                  <Building className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Failed to load partners</h3>
                  <p className="text-sm">We're having trouble loading our partner information. Please try again later.</p>
                </div>
              </div>
            ) : partnersData?.partners && partnersData.partners.length > 0 ? (
              <div>
                <div className="mb-8 text-center">
                  <p className="text-text-dark/60 dark:text-text-light/60">
                    Proudly working with <span className="font-semibold text-primary">{partnersData.count}</span> organizations worldwide
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                  {partnersData.partners.map((partner) => (
                    <div 
                      key={partner.id} 
                      className="group relative bg-white dark:bg-neutral-dark rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-300 border border-neutral-light/50 dark:border-neutral-dark/50"
                    >
                      <div className="flex items-center justify-center h-20 mb-4">
                        {imageErrors.has(partner.id) ? (
                          <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-lg border flex items-center justify-center">
                            <Building className="h-8 w-8 text-gray-400" />
                          </div>
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center">
                            {imageLoading.has(partner.id) && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
                              </div>
                            )}
                            <img 
                              src={getCacheBustedImageUrl(partner.logoUrl, partner.updatedAt)} 
                              alt={partner.altText} 
                              className={`max-h-16 max-w-full w-auto h-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300 ${
                                imageLoading.has(partner.id) ? 'opacity-0' : 'opacity-100'
                              }`}
                              onError={() => handleImageError(partner.id)}
                              onLoad={() => handleImageLoad(partner.id)}
                              onLoadStart={() => handleImageLoadStart(partner.id)}
                              loading="lazy"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="text-center">
                        <h3 className="font-semibold text-text-dark dark:text-text-light mb-2 group-hover:text-primary transition-colors">
                          {partner.name}
                        </h3>
                        
                        {partner.websiteUrl && (
                          <a 
                            href={partner.websiteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-text-dark/60 dark:text-text-light/60 hover:text-primary transition-colors"
                            title={`Visit ${partner.name} website`}
                          >
                            Visit Website
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        )}
                      </div>
                      
                      {partner.websiteUrl && (
                        <a 
                          href={partner.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 rounded-lg"
                          aria-label={`Visit ${partner.name} website`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <Building className="h-16 w-16 mx-auto mb-6 text-gray-400" />
                <h3 className="text-xl font-semibold text-text-dark dark:text-text-light mb-2">
                  No partners available
                </h3>
                <p className="text-text-dark/60 dark:text-text-light/60 max-w-md mx-auto">
                  We're building our network of global partners. Check back soon for updates on our growing ecosystem.
                </p>
              </div>
            )}
          </div>

          {/* Call to Action */}
          {partnersData?.partners && partnersData.partners.length > 0 && (
            <div className="text-center">
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-lg p-8">
                <h2 className="text-2xl font-bold text-text-dark dark:text-text-light mb-4">
                  Interested in Partnering with Us?
                </h2>
                <p className="text-text-dark/70 dark:text-text-light/70 mb-6 max-w-2xl mx-auto">
                  Join our global network of innovators, organizations, and institutions working together 
                  to solve the world's most pressing challenges through structured innovation.
                </p>
                <a
                  href="/apply"
                  className="inline-block rounded-full bg-primary hover:bg-primary-dark px-8 py-3 text-white font-medium transition-all transform hover:scale-105"
                >
                  Become a Partner
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
