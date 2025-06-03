// Debounce function to limit how often a function can be called
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Generate URLs for images stored in our system
export function getImageUrl(filePath: string): string {
  if (!filePath) return '';
  
  // If it's already a full URL (for backwards compatibility), return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Generate URL for our image serving endpoint
  const params = new URLSearchParams({ 
    input: JSON.stringify({ filePath }) 
  });
  return `/api/trpc/getImage?${params.toString()}`;
}

// Generate cache-busted image URLs for our stored images
export function getCacheBustedImageUrl(filePath: string, updatedAt?: Date | string): string {
  if (!filePath) return '';
  
  // If it's already a full URL (for backwards compatibility), use original function
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    if (!updatedAt) return filePath;
    
    const timestamp = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
    const cacheBuster = timestamp.getTime();
    const separator = filePath.includes('?') ? '&' : '?';
    return `${filePath}${separator}v=${cacheBuster}`;
  }
  
  // For our stored images, add cache buster to the tRPC endpoint
  const params = new URLSearchParams({ 
    input: JSON.stringify({ filePath }) 
  });
  
  if (updatedAt) {
    const timestamp = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
    const cacheBuster = timestamp.getTime();
    params.append('v', cacheBuster.toString());
  }
  
  return `/api/trpc/getImage?${params.toString()}`;
}

// Check if a path is a stored image file path (not a URL)
export function isStoredImagePath(path: string): boolean {
  if (!path) return false;
  return !path.startsWith('http://') && !path.startsWith('https://');
}

// Extract file extension from stored image path
export function getImageFileExtension(filePath: string): string {
  if (!filePath) return '';
  const parts = filePath.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

// Throttle function to limit function calls to once per interval
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Format currency values for display
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format large numbers with appropriate suffixes (K, M, B)
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// Format dates for consistent display
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  
  return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
}

// Get relative time string (e.g., "2 days ago", "in 3 hours")
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}

// Truncate text to specified length with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// Generate URL-friendly slugs from text
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
