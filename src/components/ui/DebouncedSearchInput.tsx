import { useState, useEffect, ChangeEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { debounce } from "~/utils";

interface DebouncedSearchInputProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
  debounceMs?: number;
  className?: string;
  ariaLabel?: string;
  value?: string;
  onChange?: (value: string) => void;
}

function DebouncedSearchInputComponent({
  onSearch,
  placeholder = "Search...",
  initialValue = "",
  debounceMs = 300,
  className = "",
  ariaLabel = "Search",
  value,
  onChange
}: DebouncedSearchInputProps) {
  const [inputValue, setInputValue] = useState(value ?? initialValue);
  const [isDebouncing, setIsDebouncing] = useState(false);
  
  // Update internal state when external value changes
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value, inputValue]);
  
  // Create a debounced version of onSearch
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = debounce((value: string) => {
    onSearch(value);
    setIsDebouncing(false);
  }, debounceMs);
  
  // Run the debounced search when inputValue changes
  useEffect(() => {
    if (inputValue !== initialValue) {
      setIsDebouncing(true);
      debouncedSearch(inputValue);
    }
  }, [inputValue, debouncedSearch, initialValue]);
  
  // Handle input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Call external onChange if provided
    if (onChange) {
      onChange(newValue);
    }
  };
  
  // Clear the input
  const handleClear = () => {
    setInputValue("");
    onSearch("");
    setIsDebouncing(false);
    
    // Call external onChange if provided
    if (onChange) {
      onChange("");
    }
  };
  
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search size={18} className="text-text-dark/40 dark:text-text-light/40" />
      </div>
      
      <input
        type="search"
        value={inputValue}
        onChange={handleChange}
        className="w-full rounded-full border-0 bg-neutral-light/20 dark:bg-neutral-dark/20 pl-10 pr-10 py-3 text-text-dark dark:text-text-light placeholder-text-dark/40 dark:placeholder-text-light/40 focus:ring-2 focus:ring-secondary focus:shadow-md transition-all duration-200"
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        {isDebouncing ? (
          <Loader2 size={18} className="text-secondary animate-spin" />
        ) : inputValue && (
          <button
            onClick={handleClear}
            className="text-text-dark/40 dark:text-text-light/40 hover:text-text-dark dark:hover:text-text-light transition-colors duration-200"
            aria-label="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

// Export both as default and named export
export default DebouncedSearchInputComponent;
export { DebouncedSearchInputComponent as DebouncedSearchInput };
