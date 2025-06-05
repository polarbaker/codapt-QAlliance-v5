// Enhanced base URL detection that works on both client and server
function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    // Browser: use current origin
    return window.location.origin;
  }
  
  // Server: check for BASE_URL environment variable first
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  // Fallback for server-side internal calls (within Docker network)
  return `http://localhost:3000`;
}

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

// Enhanced validation for image paths
export function isValidImagePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  
  // Check for data URLs
  if (filePath.startsWith('data:')) {
    return filePath.includes('image/') && filePath.includes('base64');
  }
  
  // Check for external URLs
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    try {
      new URL(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  // Check for stored image paths (UUID.extension format)
  const storedImageRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif)$/i;
  return storedImageRegex.test(filePath.trim());
}

// Enhanced error handling for image URLs
export function getImageUrlWithFallback(filePath: string, fallbackUrl?: string): string {
  if (!filePath || !isValidImagePath(filePath)) {
    return fallbackUrl || '';
  }
  
  return getImageUrl(filePath);
}

// Generate URLs for images stored in our system with variant support
export function getImageUrl(filePath: string, variantType?: string): string {
  if (!filePath) {
    console.warn('getImageUrl called with empty filePath');
    return '';
  }
  
  // Enhanced validation
  if (!isValidImagePath(filePath)) {
    console.warn('getImageUrl called with invalid filePath:', filePath);
    return '';
  }
  
  // If it's already a full URL (for backwards compatibility), return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  
  // If it's a data URL (base64), return as-is
  if (filePath.startsWith('data:')) {
    return filePath;
  }
  
  // Generate URL for our image serving endpoint with proper tRPC structure
  const input = variantType 
    ? { filePath: filePath.trim(), variantType }
    : { filePath: filePath.trim() };
  
  const endpoint = variantType ? 'getImageVariant' : 'getImage';
  
  try {
    const encodedInput = encodeURIComponent(JSON.stringify(input));
    
    // Use the proper base URL function
    const baseUrl = getBaseUrl().replace(/\/$/, ''); // Remove trailing slash
    
    return `${baseUrl}/api/trpc/${endpoint}?input=${encodedInput}`;
  } catch (error) {
    console.error('Error encoding image URL input:', error, { filePath, variantType });
    // Fallback: simple URL construction with relative path
    return `/api/trpc/${endpoint}?input=${encodeURIComponent(JSON.stringify({ filePath: filePath.trim() }))}`;
  }
}

// Generate cache-busted image URLs with variant support
export function getCacheBustedImageUrl(filePath: string, updatedAt?: Date | string, variantType?: string): string {
  if (!filePath) {
    console.warn('getCacheBustedImageUrl called with empty filePath');
    return '';
  }
  
  // Enhanced validation
  if (!isValidImagePath(filePath)) {
    console.warn('getCacheBustedImageUrl called with invalid filePath:', filePath);
    return '';
  }
  
  // If it's already a full URL (for backwards compatibility), use original function
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    if (!updatedAt) return filePath;
    
    try {
      const timestamp = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
      const cacheBuster = timestamp.getTime();
      const separator = filePath.includes('?') ? '&' : '?';
      return `${filePath}${separator}v=${cacheBuster}`;
    } catch (error) {
      console.warn('Error creating cache buster for external URL:', error);
      return filePath;
    }
  }
  
  // If it's a data URL (base64), return as-is
  if (filePath.startsWith('data:')) {
    return filePath;
  }
  
  // For our stored images, add cache buster to the tRPC endpoint
  const input = variantType 
    ? { filePath: filePath.trim(), variantType }
    : { filePath: filePath.trim() };
  
  const endpoint = variantType ? 'getImageVariant' : 'getImage';
  
  try {
    const encodedInput = encodeURIComponent(JSON.stringify(input));
    
    // Use the proper base URL function
    const baseUrl = getBaseUrl().replace(/\/$/, ''); // Remove trailing slash
    
    let url = `${baseUrl}/api/trpc/${endpoint}?input=${encodedInput}`;
    
    // Enhanced cache busting logic
    let cacheBuster: number;
    if (updatedAt) {
      const timestamp = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
      cacheBuster = timestamp.getTime();
    } else {
      // Add current timestamp as fallback to prevent stale cache
      cacheBuster = Date.now();
    }
    
    // Add random component to ensure fresh loading even with same timestamp
    const randomComponent = Math.floor(Math.random() * 1000);
    url += `&v=${cacheBuster}&r=${randomComponent}`;
    
    return url;
  } catch (error) {
    console.error('Error creating cache-busted URL:', error, { filePath, updatedAt, variantType });
    // Fallback: basic URL without cache busting
    return getImageUrl(filePath, variantType);
  }
}

// Get absolute image URL for debugging purposes
export function getAbsoluteImageUrl(filePath: string, variantType?: string): string {
  const url = getImageUrl(filePath, variantType);
  
  // If already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Make relative URL absolute using the proper base URL function
  const baseUrl = getBaseUrl();
  return `${baseUrl}${url}`;
}

// Validate and normalize image URLs for consistent handling
export function normalizeImageUrl(url: string): string {
  if (!url) return '';
  
  try {
    // If it's a relative URL starting with /api/trpc, make it absolute
    if (url.startsWith('/api/trpc/')) {
      const baseUrl = getBaseUrl();
      return `${baseUrl}${url}`;
    }
    
    // If it's already absolute or a data URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    
    // For other relative URLs, make them absolute
    const baseUrl = getBaseUrl();
    return new URL(url, baseUrl).toString();
  } catch (error) {
    console.warn('Error normalizing image URL:', error, { url });
    return url;
  }
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

// Format file sizes for user display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
