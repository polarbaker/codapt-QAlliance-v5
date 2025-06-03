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

// Generate URLs for images stored in our system with variant support
export function getImageUrl(filePath: string, variantType?: string): string {
  if (!filePath) return '';
  
  // If it's already a full URL (for backwards compatibility), return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Generate URL for our image serving endpoint with optional variant
  const params = new URLSearchParams({ 
    input: JSON.stringify({ 
      filePath,
      ...(variantType && { variantType })
    }) 
  });
  
  const endpoint = variantType ? 'getImageVariant' : 'getImage';
  return `/api/trpc/${endpoint}?${params.toString()}`;
}

// Generate cache-busted image URLs with variant support
export function getCacheBustedImageUrl(filePath: string, updatedAt?: Date | string, variantType?: string): string {
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
    input: JSON.stringify({ 
      filePath,
      ...(variantType && { variantType })
    }) 
  });
  
  if (updatedAt) {
    const timestamp = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
    const cacheBuster = timestamp.getTime();
    params.append('v', cacheBuster.toString());
  }
  
  const endpoint = variantType ? 'getImageVariant' : 'getImage';
  return `/api/trpc/${endpoint}?${params.toString()}`;
}

// Get responsive image URLs for different screen sizes
export function getResponsiveImageUrls(filePath: string): {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  original: string;
} {
  return {
    thumbnail: getImageUrl(filePath, 'thumbnail'),
    small: getImageUrl(filePath, 'small'),
    medium: getImageUrl(filePath, 'medium'),
    large: getImageUrl(filePath, 'large'),
    original: getImageUrl(filePath),
  };
}

// Generate srcset for responsive images
export function generateImageSrcSet(filePath: string): string {
  if (!filePath || filePath.startsWith('http')) {
    return filePath; // Fallback for external URLs
  }
  
  const variants = [
    { type: 'small', width: 400 },
    { type: 'medium', width: 800 },
    { type: 'large', width: 1600 },
  ];
  
  return variants
    .map(variant => `${getImageUrl(filePath, variant.type)} ${variant.width}w`)
    .join(', ');
}

// Get optimal image URL based on container size
export function getOptimalImageUrl(filePath: string, containerWidth: number): string {
  if (!filePath) return '';
  
  // If it's an external URL, return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // Choose optimal variant based on container width
  if (containerWidth <= 150) return getImageUrl(filePath, 'thumbnail');
  if (containerWidth <= 400) return getImageUrl(filePath, 'small');
  if (containerWidth <= 800) return getImageUrl(filePath, 'medium');
  if (containerWidth <= 1600) return getImageUrl(filePath, 'large');
  
  return getImageUrl(filePath); // Original for very large containers
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

// Extract image information from file path
export function getImageInfo(filePath: string): {
  extension: string;
  baseName: string;
  isVariant: boolean;
  variantType?: string;
} {
  if (!filePath) return { extension: '', baseName: '', isVariant: false };
  
  const parts = filePath.split('.');
  const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  
  // Check if this is a variant (contains variant type before extension)
  const nameWithoutExt = parts.slice(0, -1).join('.');
  const variantMatch = nameWithoutExt.match(/_([a-z_]+)$/);
  
  if (variantMatch) {
    const variantType = variantMatch[1];
    const baseName = nameWithoutExt.replace(`_${variantType}`, '');
    return {
      extension,
      baseName,
      isVariant: true,
      variantType,
    };
  }
  
  return {
    extension,
    baseName: nameWithoutExt,
    isVariant: false,
  };
}

// Format image dimensions for display
export function formatImageDimensions(width?: number, height?: number): string {
  if (!width || !height) return 'Unknown dimensions';
  return `${width} × ${height}px`;
}

// Calculate aspect ratio
export function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

// Get aspect ratio description
export function getAspectRatioDescription(aspectRatio: number): string {
  if (aspectRatio > 1.7) return 'Wide';
  if (aspectRatio > 1.2) return 'Landscape';
  if (aspectRatio > 0.8) return 'Square';
  if (aspectRatio > 0.6) return 'Portrait';
  return 'Tall';
}

// Format compression ratio for display
export function formatCompressionRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}% reduction`;
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
