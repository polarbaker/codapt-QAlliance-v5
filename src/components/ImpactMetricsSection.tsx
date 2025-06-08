import { useEffect, useState, useRef, useCallback } from "react";
import { useTRPC } from "~/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useBulkSiteContentText } from "~/hooks/useSiteContentText";

// Optimized counter animation hook
function useCountUp(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  // Optimize animate function with useCallback
  const animate = useCallback((timestamp: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp;
    }

    const progress = timestamp - startTimeRef.current;
    const percentage = Math.min(progress / duration, 1);
    
    countRef.current = Math.floor(percentage * end);
    setCount(countRef.current);

    if (percentage < 1) {
      requestAnimationFrame(animate);
    }
  }, [end, duration]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Reset start time when element comes into view
          startTimeRef.current = null;
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById("impact");
    if (element) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [animate]);

  return count;
}

interface MetricProps {
  value: number;
  suffix?: string;
  label: string;
}

function Metric({ value, suffix = "", label }: MetricProps) {
  const count = useCountUp(value);
  
  return (
    <div className="text-center">
      <div className="mb-2 text-6xl font-black text-secondary md:text-7xl lg:text-8xl">
        {count}
        {suffix}
      </div>
      <div className="text-lg font-light uppercase tracking-wider text-text-light md:text-xl">
        {label}
      </div>
    </div>
  );
}

export default function ImpactMetricsSection() {
  const trpc = useTRPC();
  
  // Fetch impact metrics section text content
  const { texts: impactTexts } = useBulkSiteContentText([
    'impact_title',
    'impact_description',
    'impact_metric1_label',
    'impact_metric2_label',
    'impact_metric3_label',
    'impact_metric4_label',
    'impact_featured_title',
    'impact_featured_heading',
    'impact_featured_paragraph',
    'impact_button_text',
  ]);
  
  // Fetch impact metrics featured image from database
  const impactImageQuery = useQuery(
    trpc.getSiteContentImage.queryOptions({
      imageType: 'impact_metrics_featured_image',
    })
  );

  // Use database image if available, otherwise fall back to hardcoded URL
  const getFeaturedImageUrl = () => {
    if (impactImageQuery.data?.hasImage && impactImageQuery.data?.imageData) {
      return impactImageQuery.data.imageData;
    }
    return 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80';
  };

  const featuredImageUrl = getFeaturedImageUrl();

  return (
    <section
      id="impact"
      className="section-padding relative overflow-hidden bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="mb-16 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-light md:text-6xl">
            {impactTexts.impact_title}
          </h2>
          <p className="text-xl font-light text-text-light/80 md:text-2xl">
            {impactTexts.impact_description}
          </p>
        </div>

        {/* Metrics in a full-width layout */}
        <div className="mb-24 grid grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-4">
          <Metric 
            value={1} 
            suffix="M+" 
            label={impactTexts.impact_metric1_label} 
          />
          <Metric 
            value={6} 
            label={impactTexts.impact_metric2_label} 
          />
          <Metric 
            value={10} 
            suffix="+" 
            label={impactTexts.impact_metric3_label} 
          />
          <Metric 
            value={3000} 
            suffix="+" 
            label={impactTexts.impact_metric4_label} 
          />
        </div>

        {/* Horizontal divider */}
        <div className="mb-24 h-px w-full bg-text-light/10"></div>

        {/* Featured impact story */}
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
          <div>
            <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-secondary">
              {impactTexts.impact_featured_title}
            </div>
            <h3 className="mb-6 text-3xl font-bold text-text-light md:text-4xl">
              {impactTexts.impact_featured_heading}
            </h3>
            <p className="mb-8 text-lg text-text-light/80">
              {impactTexts.impact_featured_paragraph}
            </p>
            <a
              href="#community"
              className="inline-block rounded-full bg-secondary px-8 py-3 text-base font-medium text-white transition-all hover:bg-secondary-light hover:scale-105"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' });
              }}
              aria-label="View case studies of our impact"
            >
              {impactTexts.impact_button_text}
            </a>
          </div>
          <div className="aspect-video overflow-hidden rounded-lg">
            <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url('${featuredImageUrl}')` }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
