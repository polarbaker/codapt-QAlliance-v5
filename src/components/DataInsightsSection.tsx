import { Download } from "lucide-react";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

// Types for metric data
interface MetricDataPoint {
  label: string;
  value: number;
}

// Simplified bar chart component
function BarChart({ data }: { data: MetricDataPoint[] }) {
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="h-full">
      <div className="flex h-[90%] items-end justify-between">
        {data.map((item, index) => (
          <div
            key={index}
            className="group relative flex w-full flex-col items-center px-2"
          >
            <div
              className="w-full rounded-t bg-secondary transition-all duration-500 group-hover:bg-secondary-light"
              style={{ height: `${(item.value / max) * 100}%` }}
            ></div>
            <div className="mt-4 text-center">
              <div className="text-sm text-text-light/70">{item.label}</div>
              <div className="text-lg font-bold text-text-light">${item.value}M</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simplified line chart component
function LineChart({ data }: { data: MetricDataPoint[] }) {
  // Calculate points for the SVG path
  const getPoints = () => {
    if (!data.length) return "";
    
    const max = Math.max(...data.map(d => d.value));
    const min = Math.min(...data.map(d => d.value));
    const range = max - min;
    
    // Calculate x and y coordinates for each data point
    return data.map((item, index) => {
      // Position points at exact column centers
      const x = (index / (data.length - 1)) * 100;
      const y = 50 - ((item.value - min) / range) * 40; // Scale to fit in viewBox
      return `${x},${y}`;
    }).join(" L ");
  };
  
  const pathPoints = getPoints();
  
  return (
    <div className="h-full">
      {/* Main container with data-graph-wrapper class for grid layout */}
      <div className="data-graph-wrapper">
        {/* SVG chart container that spans all columns */}
        <div className="chart-container">
          <svg
            className="h-full w-full"
            viewBox="0 0 100 50"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Horizontal grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`h-grid-${i}`}
                x1="0"
                y1={i * 12.5}
                x2="100"
                y2={i * 12.5}
                stroke="#333333"
                strokeWidth="0.3"
                strokeDasharray="1,2"
                opacity="0.2"
              />
            ))}
            
            {/* Vertical grid lines aligned with column centers */}
            {data.map((_, index) => {
              const x = (index / (data.length - 1)) * 100; // Evenly space across full width
              return (
                <line
                  key={`v-grid-${index}`}
                  x1={x}
                  y1="0"
                  x2={x}
                  y2="50"
                  stroke="#333333"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                  opacity="0.3"
                />
              );
            })}
            
            {/* Area fill under the line */}
            <path
              d={`M ${pathPoints} L 100,50 L 0,50 Z`}
              fill="url(#gradient)"
              fillOpacity="0.2"
            />
            
            {/* Line connecting data points */}
            <path
              d={`M ${pathPoints}`}
              fill="none"
              stroke="#FF5722"
              strokeWidth="2"
            />
            
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FF5722" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FF5722" stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Data point markers positioned at column centers */}
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 100; // Evenly space across full width
              const max = Math.max(...data.map(d => d.value));
              const min = Math.min(...data.map(d => d.value));
              const range = max - min;
              const y = 50 - ((item.value - min) / range) * 40;
              
              return (
                <circle
                  key={`point-${index}`}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#FF5722"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>
        
        {/* Year and data labels using data-columns class for alignment */}
        <div className="data-columns">
          {data.map((item, index) => (
            <div key={index} className="data-column">
              {/* Visual connector between chart point and label */}
              <div className="absolute -top-2 left-1/2 h-4 w-0.5 bg-secondary opacity-40 transform -translate-x-1/2"></div>
              <div className="text-sm text-text-light/70">{item.label}</div>
              <div className="text-lg font-bold text-text-light">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Simplified pie chart representation as a percentage bar
function PercentageBar({ data }: { data: MetricDataPoint[] }) {
  // Calculate total for percentages
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Colors for regions
  const colors = [
    "bg-secondary",
    "bg-accent",
    "bg-primary-light",
    "bg-neutral-medium",
    "bg-accent-dark",
  ];
  
  // Calculate each segment's percentage
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    return {
      ...item,
      percentage,
      color: colors[index % colors.length],
    };
  });
  
  return (
    <div className="flex h-full flex-col">
      {/* Percentage bar */}
      <div className="mb-8 h-8 w-full flex rounded-full overflow-hidden">
        {segments.map((segment, index) => (
          <div
            key={index}
            className={`h-full ${segment.color} transition-all hover:brightness-110`}
            style={{ width: `${segment.percentage}%` }}
            title={`${segment.label}: ${segment.percentage.toFixed(1)}%`}
          ></div>
        ))}
      </div>
      
      {/* Legend with improved layout and spacing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-10">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={`h-5 w-5 flex-shrink-0 rounded-sm ${segment.color}`}></div>
            <div className="flex flex-col">
              <div className="text-sm font-medium text-text-light/80">{segment.label}</div>
              <div className="text-lg font-bold text-text-light">{segment.percentage.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Improved loading state component
const ChartLoadingState = () => (
  <div className="flex h-full w-full items-center justify-center bg-neutral-dark/10 rounded-lg p-8">
    <div className="flex flex-col items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-secondary mb-4"></div>
      <p className="text-text-light/70 text-sm">Loading chart data...</p>
    </div>
  </div>
);

// Improved error state component
const ChartErrorState = ({ message }: { message: string }) => (
  <div className="flex h-full w-full items-center justify-center bg-red-500/10 rounded-lg p-8">
    <div className="flex flex-col items-center text-center">
      <p className="text-red-500 mb-2">Unable to load chart data</p>
      <p className="text-text-light/70 text-sm">{message}</p>
    </div>
  </div>
);

export default function DataInsightsSection() {
  // Fetch funds raised data
  const fundsRaisedQuery = api.getImpactMetrics.useQuery({
    metricType: 'fundsRaised'
  }, {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch region percentage data
  const regionPercentageQuery = api.getImpactMetrics.useQuery({
    metricType: 'regionPercentage'
  }, {
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return (
    <section
      id="data"
      className="section-padding relative overflow-hidden bg-background-black"
    >
      <div className="mx-auto max-w-7xl container-padding">
        <div className="mb-16 max-w-3xl">
          <h2 className="mb-8 text-5xl font-extrabold leading-tight text-text-light md:text-6xl">
            Impact Data
          </h2>
          <p className="text-xl font-light text-text-light/80 md:text-2xl">
            Measuring our global impact through transparent data and real-world outcomes.
          </p>
        </div>

        {/* Charts in a vertical layout */}
        <div className="space-y-24">
          {/* Funds Raised Chart */}
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2">
            <div>
              <div className="mb-6 text-sm font-semibold uppercase tracking-widest text-secondary">
                Funds Raised
              </div>
              <h3 className="mb-6 text-3xl font-bold text-text-light md:text-4xl">
                $350M+ in Funding for Innovators
              </h3>
              <p className="mb-8 text-lg text-text-light/80">
                Our innovators have raised significant capital to scale their solutions globally, with a steady increase year over year.
              </p>
            </div>
            
            <div className="h-60 sm:h-80 md:h-72 lg:h-80">
              {fundsRaisedQuery.isLoading ? (
                <ChartLoadingState />
              ) : fundsRaisedQuery.isError ? (
                <ChartErrorState message={fundsRaisedQuery.error.message} />
              ) : (
                <BarChart data={fundsRaisedQuery.data?.data || []} />
              )}
            </div>
          </div>

          {/* Region Distribution Chart */}
          <div className="pt-8 mt-8 border-t border-neutral-dark space-y-12">
            {/* Heading moved above both columns */}
            <div className="text-center">
              <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-secondary">
                Global Distribution
              </div>
              <h3 className="text-3xl font-bold text-text-light md:text-4xl">
                Partnerships Across 6 Continents
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
              <div className="flex flex-col justify-center">
                <p className="text-lg text-text-light/80">
                  Our global reach ensures diverse perspectives and solutions that address challenges in various contexts.
                </p>
              </div>
              
              <div className="h-auto flex flex-col justify-center">
                {regionPercentageQuery.isLoading ? (
                  <ChartLoadingState />
                ) : regionPercentageQuery.isError ? (
                  <ChartErrorState message={regionPercentageQuery.error.message} />
                ) : (
                  <PercentageBar data={regionPercentageQuery.data?.data || []} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Download report button */}
        <div className="mt-24 text-center">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // Create a simulated download by creating a temporary anchor with download attribute
              const link = document.createElement('a');
              link.href = '/impact-report-placeholder.pdf'; // This would be a real PDF in production
              link.download = 'Quantum_Alliance_Impact_Report.pdf';
              link.click();
              toast.success("Impact Report download started! Check your downloads folder for the complete data analysis.");
            }}
            className="inline-flex items-center rounded-full bg-secondary px-8 py-4 text-lg font-medium text-white transition-all hover:bg-secondary-light hover:scale-105"
            aria-label="Download our latest impact report"
          >
            <Download size={20} className="mr-3" />
            Download Impact Report
          </a>
        </div>
      </div>
    </section>
  );
}
