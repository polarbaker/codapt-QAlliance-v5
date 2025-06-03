import { X, Filter } from "lucide-react";
import DebouncedSearchInput from "./ui/DebouncedSearchInput";

interface ChallengeFiltersProps {
  categories: string[];
  regions: string[];
  statuses: string[];
  selectedCategory: string | null;
  selectedRegion: string | null;
  selectedStatus: string | null;
  searchQuery: string;
  onCategoryChange: (category: string | null) => void;
  onRegionChange: (region: string | null) => void;
  onStatusChange: (status: string | null) => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

export default function ChallengeFilters({
  categories,
  regions,
  statuses,
  selectedCategory,
  selectedRegion,
  selectedStatus,
  searchQuery,
  onCategoryChange,
  onRegionChange,
  onStatusChange,
  onSearchChange,
  onClearFilters,
}: ChallengeFiltersProps) {
  const hasActiveFilters = selectedCategory || selectedRegion || selectedStatus || searchQuery;
  
  return (
    <div className="mb-12 rounded-lg bg-neutral-dark/10 p-6 transition-all duration-300">
      {/* Search Bar */}
      <div className="mb-6">
        <DebouncedSearchInput
          placeholder="Search challenges..."
          initialValue={searchQuery}
          onSearch={onSearchChange}
          ariaLabel="Search challenges"
          debounceMs={300}
        />
      </div>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="mb-2 block text-sm font-medium text-text-light/70">
            Category
          </label>
          <div className="relative">
            <select
              id="category-filter"
              value={selectedCategory || ""}
              onChange={(e) => onCategoryChange(e.target.value || null)}
              className="w-full appearance-none rounded-lg border-0 bg-neutral-dark/30 px-4 py-2.5 pr-10 text-text-light focus:ring-2 focus:ring-secondary transition-all duration-200"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
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
        
        {/* Region Filter */}
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
        
        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="mb-2 block text-sm font-medium text-text-light/70">
            Status
          </label>
          <div className="relative">
            <select
              id="status-filter"
              value={selectedStatus || ""}
              onChange={(e) => onStatusChange(e.target.value || null)}
              className="w-full appearance-none rounded-lg border-0 bg-neutral-dark/30 px-4 py-2.5 pr-10 text-text-light focus:ring-2 focus:ring-secondary transition-all duration-200"
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
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
      
      {/* Active Filters and Clear Button */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        {/* Active Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedCategory && (
            <div className="flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm text-text-light">
              <span>Category: {selectedCategory}</span>
              <button
                onClick={() => onCategoryChange(null)}
                className="ml-2 rounded-full p-1 hover:bg-secondary/30 transition-colors"
                aria-label={`Remove ${selectedCategory} category filter`}
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
          
          {selectedStatus && (
            <div className="flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm text-text-light">
              <span>Status: {selectedStatus}</span>
              <button
                onClick={() => onStatusChange(null)}
                className="ml-2 rounded-full p-1 hover:bg-secondary/30 transition-colors"
                aria-label={`Remove ${selectedStatus} status filter`}
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
        
        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center rounded-full bg-neutral-dark/50 px-4 py-2 text-sm text-text-light transition-all hover:bg-neutral-dark hover:shadow-md"
            aria-label="Clear all filters"
          >
            <Filter size={16} className="mr-2" />
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
}
