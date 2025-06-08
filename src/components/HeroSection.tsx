import { ChevronDown } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useBulkSiteContentText } from "~/hooks/useSiteContentText";

export default function HeroSection() {
  const [isVisible, setIsVisible] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [backgroundImageError, setBackgroundImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80");
  const maxRetries = 2;
  const heroRef = useRef<HTMLDivElement>(null);

  const trpc = useTRPC();
  
  // Fetch hero text content
  const { texts: heroTexts, isLoading: isLoadingTexts } = useBulkSiteContentText([
    'hero_title_part1',
    'hero_title_part2',
    'hero_description',
    'hero_button1_text',
    'hero_button2_text',
    'hero_stat_number',
    'hero_stat_label',
    'hero_scroll_text',
  ]);
  
  // Fetch hero background image from database
  const heroImageQuery = useQuery(
    trpc.getSiteContentImage.queryOptions({
      imageType: 'hero_background',
    })
  );

  // Use database image if available, otherwise fall back to hardcoded URL
  const getBackgroundImageUrl = () => {
    // If we have a custom image from the database, use it
    if (heroImageQuery.data?.hasImage && heroImageQuery.data?.imageData) {
      return heroImageQuery.data.imageData;
    }
    
    // Otherwise, use the current backgroundImageUrl state (with fallbacks)
    return backgroundImageUrl;
  };

  const currentBackgroundUrl = getBackgroundImageUrl();

  const handleBackgroundImageError = () => {
    if (retryCount < maxRetries) {
      // Try alternative working URLs for technology/innovation theme
      const fallbackUrls = [
        "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80", // Network/tech
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80", // Technology/coding
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80"  // Innovation/tech
      ];
      
      const nextUrl = fallbackUrls[retryCount];
      if (nextUrl) {
        setRetryCount(prev => prev + 1);
        setBackgroundImageUrl(nextUrl);
        setBackgroundImageError(false);
        return;
      }
    }
    
    setBackgroundImageError(true);
  };

  const handleManualRetry = () => {
    setRetryCount(0);
    setBackgroundImageUrl("https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=2072&q=80");
    setBackgroundImageError(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      // Update scroll position for parallax effect
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      id="home"
      ref={heroRef}
      className="relative flex min-h-screen w-full flex-col justify-center overflow-hidden bg-background-black pt-20"
    >
      {/* Background image with parallax effect */}
      <div 
        className="absolute inset-0 z-0 opacity-40"
        style={{ 
          transform: `translateY(${scrollY * 0.15}px)` 
        }}
      >
        {backgroundImageError ? (
          <div className="h-full w-full bg-gradient-to-br from-background-black via-neutral-dark to-background-black"></div>
        ) : (
          <img
            src={currentBackgroundUrl}
            alt="Technology and innovation background"
            className="h-full w-full object-cover"
            onError={handleBackgroundImageError}
            loading="eager"
            crossOrigin="anonymous"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background-black via-background-black/60 to-transparent"></div>
      </div>

      {/* Floating particles effect */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 h-4 w-4 animate-float rounded-full bg-secondary [animation-delay:0s]"></div>
        <div className="absolute top-1/3 left-1/2 h-6 w-6 animate-float rounded-full bg-secondary [animation-delay:1s]"></div>
        <div className="absolute top-2/3 left-1/3 h-3 w-3 animate-float rounded-full bg-secondary [animation-delay:2s]"></div>
        <div className="absolute top-1/2 left-3/4 h-5 w-5 animate-float rounded-full bg-secondary [animation-delay:0.5s]"></div>
        <div className="absolute top-3/4 left-1/5 h-4 w-4 animate-float rounded-full bg-secondary [animation-delay:1.5s]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="animate-fade-in">
            <h1 className="mb-6 text-5xl font-extrabold leading-none tracking-tight text-text-light sm:text-6xl md:text-7xl xl:text-8xl">
              <span className="block">{heroTexts.hero_title_part1}</span>
              <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">{heroTexts.hero_title_part2}</span>
            </h1>
            <p className="mb-10 max-w-2xl text-xl font-light text-text-light/80 md:text-2xl">
              {heroTexts.hero_description}
            </p>
            
            <div className="flex flex-wrap gap-4">
              <a
                href="#join-us"
                className="group inline-block rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light hover:scale-105 hover:shadow-lg"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('join-us')?.scrollIntoView({ behavior: 'smooth' });
                }}
                aria-label="Join the Quantum Alliance"
              >
                <span className="flex items-center">
                  {heroTexts.hero_button1_text}
                  <svg 
                    className="ml-2 h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </a>
              <a
                href="/challenges"
                className="group inline-block rounded-full border-2 border-text-light bg-transparent px-8 py-4 text-lg font-medium text-text-light transition-all hover:bg-text-light hover:text-background-black hover:scale-105 hover:shadow-lg"
                aria-label="Explore current challenges"
              >
                <span className="flex items-center">
                  {heroTexts.hero_button2_text}
                  <svg 
                    className="ml-2 h-5 w-5 transform transition-transform duration-300 group-hover:translate-x-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </a>
            </div>
          </div>
          
          <div className="hidden lg:block">
            {/* Large stat number with enhanced styling */}
            <div className="animate-fade-in [animation-delay:300ms]">
              <div className="relative">
                <span className="block text-center text-[10rem] font-black leading-none text-secondary drop-shadow-lg">
                  {heroTexts.hero_stat_number}
                </span>
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                  <span className="text-[20rem] font-black text-white">{heroTexts.hero_stat_number}</span>
                </div>
              </div>
              <span className="block text-center text-2xl font-light uppercase tracking-widest text-text-light">
                {heroTexts.hero_stat_label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Arrow with enhanced animation */}
      <div
        className={`absolute bottom-8 left-1/2 z-20 -translate-x-1/2 transform transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <a
          href="#statement"
          className="group flex flex-col items-center text-text-light"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById('statement')?.scrollIntoView({ behavior: 'smooth' });
          }}
        >
          <span className="mb-2 text-sm font-light tracking-wider group-hover:text-secondary transition-colors">{heroTexts.hero_scroll_text}</span>
          <div className="relative h-10 w-10 flex items-center justify-center overflow-hidden">
            <ChevronDown size={24} className="animate-bounce absolute group-hover:text-secondary transition-colors" />
          </div>
        </a>
      </div>
    </section>
  );
}
