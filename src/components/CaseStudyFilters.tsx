import { X, Filter } from "lucide-react";
import DebouncedSearchInput from "./ui/DebouncedSearchInput";

interface CaseStudyFiltersProps {
  tags: string[];
  regions: string[];
  years: string[];
  selectedTag: string | null;
  selectedRegion: string | null;
  selectedYear: string | null;
  searchQuery: string;
  onTagChange: (tag: string | null) => void;
  onRegionChange: (region: string | null) => void;
  onYearChange: (year: string | null) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
}

export default function CaseStudyFilters({
  tags,
  regions,
  years,
  selectedTag,
  selectedRegion,
  selectedYear,
  searchQuery,
  onTagChange,
  onRegionChange,
  onYearChange,
  onSearchChange,
  onClearFilters,
}: CaseStudyFiltersProps) {
  const isFiltersActive = selectedTag !== null || selectedRegion !== null || selectedYear !== null || searchQuery !== "";
  
  return (
    <div className="mb-12 rounded-lg bg-neutral-dark/10 p-6 transition-all duration-300">
      {/* Search Bar */}
      <div className="mb-6">
        <DebouncedSearchInput
          placeholder="Search case studies..."
          initialValue={searchQuery}
          onSearch={onSearchChange}
          ariaLabel="Search case studies"
          debounceMs={300}
        />
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Tags Filter */}
        <div>
          <label htmlFor="tag-filter" className="mb-2 block text-sm font-medium text-text-light/70">
            Category
          </label>
          <div className="relative">
            <select
              id="tag-filter"
              value={selectedTag || ""}
              onChange={(e) => onTagChange(e.target.value || null)}
              className="w-full appearance-none rounded-lg border-0 bg-neutral-dark/30 px-4 py-2.5 pr-10 text-text-light focus:ring-2 focus:ring-secondary transition-all duration-200"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-light/50">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Regions Filter */}
        <div>
          <label htmlFor="region-filter" className="mb-2 block text-sm font-medium text-text-light/70">
            Region
          </label>
          <div className="relative">
            <select
              id="region-filter"
              value={selectedRegion || ""}
              onChange={(e) => onRegionChange(e.target.value || null)}
              className="w-full appearance-none rounded-lg border-0 bg-neutral-dark/30 px-4 py-2.5 pr-10 text-text-light focus:ring-2 focus:ring-secondary transition-all duration-200"
              aria-label="Filter by region"
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-light/50">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Years Filter */}
        <div>
          <label htmlFor="year-filter" className="mb-2 block text-sm font-medium text-text-light/70">
            Year
          </label>
          <div className="relative">
            <select
              id="year-filter"
              value={selectedYear || ""}
              onChange={(e) => onYearChange(e.target.value || null)}
              className="w-full appearance-none rounded-lg border-0 bg-neutral-dark/30 px-4 py-2.5 pr-10 text-text-light focus:ring-2 focus:ring-secondary transition-all duration-200"
              aria-label="Filter by year"
            >
              <option value="">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-text-light/50">
              <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filter Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {/* Active Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedTag && (
            <div className="flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm text-text-light">
              <span>Category: {selectedTag}</span>
              <button
                onClick={() => onTagChange(null)}
                className="ml-2 rounded-full p-1 hover:bg-secondary/30 transition-colors"
                aria-label={`Remove ${selectedTag} category filter`}
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          {selectedRegion && (
            <div className="flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm text-text-light">
              <span>Region: {selectedRegion}</span>
              <button
                onClick={() => onRegionChange(null)}
                className="ml-2 rounded-full p-1 hover:bg-secondary/30 transition-colors"
                aria-label={`Remove ${selectedRegion} region filter`}
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          {selectedYear && (
            <div className="flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm text-text-light">
              <span>Year: {selectedYear}</span>
              <button
                onClick={() => onYearChange(null)}
                className="ml-2 rounded-full p-1 hover:bg-secondary/30 transition-colors"
                aria-label={`Remove ${selectedYear} year filter`}
              >
                <X size={12} />
              </button>
            </div>
          )}
          
          {searchQuery && (
            <div className="flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm text-text-light">
              <span>Search: {searchQuery}</span>
              <button
                onClick={() => onSearchChange("")}
                className="ml-2 rounded-full p-1 hover:bg-secondary/30 transition-colors"
                aria-label="Clear search query"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3">
          {isFiltersActive && (
            <button
              onClick={onClearFilters}
              className="flex items-center rounded-full bg-neutral-dark/50 px-4 py-2 text-sm text-text-light transition-all hover:bg-neutral-dark hover:shadow-md"
              aria-label="Clear all filters"
            >
              <Filter size={16} className="mr-2" />
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
