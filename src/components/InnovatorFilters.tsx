import { Filter, X } from "lucide-react";
import DebouncedSearchInput from "./ui/DebouncedSearchInput";

interface InnovatorFiltersProps {
  domains: string[];
  selectedDomain: string | null;
  searchQuery: string;
  onDomainChange: (domain: string | null) => void;
  onSearchChange: (search: string) => void;
  onClearFilters: () => void;
}

export default function InnovatorFilters({
  domains,
  selectedDomain,
  searchQuery,
  onDomainChange,
  onSearchChange,
  onClearFilters,
}: InnovatorFiltersProps) {
  const hasActiveFilters = selectedDomain || searchQuery;
  
  return (
    <div className="mb-12 rounded-lg bg-neutral-dark/10 p-6 transition-all duration-300">
      {/* Search Bar */}
      <div className="mb-6">
        <DebouncedSearchInput
          placeholder="Search innovators..."
          initialValue={searchQuery}
          onSearch={onSearchChange}
          ariaLabel="Search innovators"
          debounceMs={300}
        />
      </div>
      
      {/* Domain Filters */}
      {domains.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-medium text-text-light/70">Domain</h4>
          <div className="flex flex-wrap gap-2">
            {domains.map((domain) => (
              <button
                key={domain}
                onClick={() => onDomainChange(selectedDomain === domain ? null : domain)}
                className={`rounded-full px-4 py-2 text-sm transition-all duration-200 hover:shadow-sm ${
                  selectedDomain === domain
                    ? "bg-secondary text-white shadow-md transform hover:scale-105"
                    : "bg-neutral-dark/30 text-text-light/80 hover:bg-neutral-dark/50"
                }`}
                aria-pressed={selectedDomain === domain}
                aria-label={`Filter by ${domain} domain`}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Filter Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Active Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedDomain && (
            <div className="flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm text-text-light">
              <span>Domain: {selectedDomain}</span>
              <button
                onClick={() => onDomainChange(null)}
                className="ml-2 rounded-full p-1 hover:bg-secondary/30 transition-colors"
                aria-label={`Remove ${selectedDomain} domain filter`}
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
          {hasActiveFilters && (
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
