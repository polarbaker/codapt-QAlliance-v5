import { useEffect, useState, useRef, useCallback } from "react";

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
  return (
    <section
      id="impact"
      className="section-padding relative overflow-hidden bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="mb-16 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-light md:text-6xl">
            Our Global Impact
          </h2>
          <p className="text-xl font-light text-text-light/80 md:text-2xl">
            Driving innovation and collaboration across the globe to solve humanity's most pressing challenges.
          </p>
        </div>

        {/* Metrics in a full-width layout */}
        <div className="mb-24 grid grid-cols-1 gap-16 sm:grid-cols-2 lg:grid-cols-4">
          <Metric 
            value={1} 
            suffix="M+" 
            label="Prize Pool Activated" 
          />
          <Metric 
            value={6} 
            label="Continents Engaged" 
          />
          <Metric 
            value={10} 
            suffix="+" 
            label="Government Partners" 
          />
          <Metric 
            value={3000} 
            suffix="+" 
            label="Innovators in Network" 
          />
        </div>

        {/* Horizontal divider */}
        <div className="mb-24 h-px w-full bg-text-light/10"></div>

        {/* Featured impact story */}
        <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
          <div>
            <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-secondary">
              Featured Impact
            </div>
            <h3 className="mb-6 text-3xl font-bold text-text-light md:text-4xl">
              From Local Solution to Global Impact
            </h3>
            <p className="mb-8 text-lg text-text-light/80">
              Learn how one startup's water purification technology went from a local pilot to serving over 100,000 people across three continents. Their innovative approach reduced costs by 60% while increasing access to clean water in drought-affected regions.
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
              See Case Studies
            </a>
          </div>
          <div className="aspect-video overflow-hidden rounded-lg">
            <div className="h-full w-full bg-[url('https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80')] bg-cover bg-center"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
