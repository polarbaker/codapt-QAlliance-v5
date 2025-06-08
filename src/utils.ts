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

// Debounce function to limit how often a function can be called with comprehensive null safety
export function debounce<T extends (...args: any[]) => any>(
  func: T | null | undefined,
  wait: number
): (...args: Parameters<T>) => void {
  // Validate inputs with null safety
  if (!func || typeof func !== 'function') {
    console.warn('Invalid function provided to debounce:', { func, type: typeof func });
    return (() => {}) as any; // Return a no-op function
  }
  
  if (typeof wait !== 'number' || isNaN(wait) || wait < 0) {
    console.warn('Invalid wait time provided to debounce, using default 300ms:', { wait });
    wait = 300;
  }
  
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    try {
      const later = () => {
        clearTimeout(timeout);
        if (func && typeof func === 'function') {
          func(...args);
        }
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    } catch (error) {
      console.error('Error in debounced function execution:', error);
    }
  };
}

// Enhanced validation for image paths with comprehensive null safety
export function isValidImagePath(filePath: string | null | undefined): boolean {
  // Early null/undefined check
  if (!filePath || typeof filePath !== 'string') {
    return false;
  }
  
  // Trim and check for empty string
  const trimmedPath = filePath.trim();
  if (trimmedPath.length === 0) {
    return false;
  }
  
  try {
    // Check for data URLs
    if (trimmedPath.startsWith('data:')) {
      return trimmedPath.includes('image/') && trimmedPath.includes('base64');
    }
    
    // Check for external URLs
    if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
      try {
        new URL(trimmedPath);
        return true;
      } catch {
        return false;
      }
    }
    
    // Check for stored image paths (UUID.extension format)
    const storedImageRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|gif|webp|bmp|tiff|svg|avif)$/i;
    return storedImageRegex.test(trimmedPath);
  } catch (error) {
    console.warn('Error validating image path:', error, { filePath: trimmedPath });
    return false;
  }
}

// Enhanced error handling for image URLs with comprehensive null safety
export function getImageUrlWithFallback(filePath: string | null | undefined, fallbackUrl?: string): string {
  try {
    // Validate inputs with null safety
    if (!filePath || typeof filePath !== 'string') {
      return fallbackUrl || '';
    }
    
    const trimmedPath = filePath.trim();
    if (trimmedPath.length === 0) {
      return fallbackUrl || '';
    }
    
    if (!isValidImagePath(trimmedPath)) {
      return fallbackUrl || '';
    }
    
    const imageUrl = getImageUrl(trimmedPath);
    return imageUrl || fallbackUrl || '';
  } catch (error) {
    console.warn('Error in getImageUrlWithFallback:', error, { filePath, fallbackUrl });
    return fallbackUrl || '';
  }
}

// Generate URLs for images stored in our system with variant support and comprehensive null safety
export function getImageUrl(filePath: string | null | undefined, variantType?: string): string {
  // Early null/undefined check with safe return
  if (!filePath || typeof filePath !== 'string') {
    console.warn('getImageUrl called with invalid filePath:', { filePath, type: typeof filePath });
    return '';
  }
  
  const trimmedPath = filePath.trim();
  if (trimmedPath.length === 0) {
    console.warn('getImageUrl called with empty filePath');
    return '';
  }
  
  try {
    // Enhanced validation
    if (!isValidImagePath(trimmedPath)) {
      console.warn('getImageUrl called with invalid filePath:', trimmedPath);
      return '';
    }
    
    // If it's already a full URL (for backwards compatibility), return as-is
    if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
      return trimmedPath;
    }
    
    // If it's a data URL (base64), return as-is
    if (trimmedPath.startsWith('data:')) {
      return trimmedPath;
    }
    
    // Generate URL for our image serving endpoint with proper tRPC structure
    const input = variantType 
      ? { filePath: trimmedPath, variantType }
      : { filePath: trimmedPath };
    
    const endpoint = variantType ? 'getImageVariant' : 'getImage';
    
    try {
      const encodedInput = encodeURIComponent(JSON.stringify(input));
      
      // Use the proper base URL function
      const baseUrl = getBaseUrl().replace(/\/$/, ''); // Remove trailing slash
      
      // Use direct tRPC endpoint URL format for Response-returning procedures
      return `${baseUrl}/api/trpc/${endpoint}?input=${encodedInput}`;
    } catch (error) {
      console.error('Error encoding image URL input:', error, { filePath: trimmedPath, variantType });
      // Fallback: simple URL construction with relative path
      const endpoint = variantType ? 'getImageVariant' : 'getImage';
      const simpleInput = variantType 
        ? `{"filePath":"${trimmedPath}","variantType":"${variantType}"}`
        : `{"filePath":"${trimmedPath}"}`;
      return `/api/trpc/${endpoint}?input=${encodeURIComponent(simpleInput)}`;
    }
  } catch (error) {
    console.error('Error in getImageUrl:', error, { filePath: trimmedPath, variantType });
    return '';
  }
}

// Generate cache-busted image URLs with variant support and comprehensive null safety
export function getCacheBustedImageUrl(
  filePath: string | null | undefined, 
  updatedAt?: Date | string | null, 
  variantType?: string
): string {
  // Early null/undefined check with safe return
  if (!filePath || typeof filePath !== 'string') {
    console.warn('getCacheBustedImageUrl called with invalid filePath:', { filePath, type: typeof filePath });
    return '';
  }
  
  const trimmedPath = filePath.trim();
  if (trimmedPath.length === 0) {
    console.warn('getCacheBustedImageUrl called with empty filePath');
    return '';
  }
  
  try {
    if (!isValidImagePath(trimmedPath)) {
      console.warn('getCacheBustedImageUrl called with invalid filePath:', trimmedPath);
      return '';
    }
    
    // For base64 data URLs, return immediately without any modification
    // Base64 data URLs don't need cache busting since they contain the actual image data
    if (trimmedPath.startsWith('data:')) {
      return trimmedPath;
    }
    
    if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
      if (!updatedAt) return trimmedPath;
      
      try {
        const timestamp = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
        const cacheBuster = timestamp && !isNaN(timestamp.getTime()) ? timestamp.getTime() : Date.now();
        const separator = trimmedPath.includes('?') ? '&' : '?';
        const url = `${trimmedPath}${separator}v=${cacheBuster}`;
        return url;
      } catch (error) {
        console.warn('Error creating cache buster for external URL:', error);
        return trimmedPath;
      }
    }
    
    const input = variantType 
      ? { filePath: trimmedPath, variantType }
      : { filePath: trimmedPath };
    
    const endpoint = variantType ? 'getImageVariant' : 'getImage';
    
    try {
      const encodedInput = encodeURIComponent(JSON.stringify(input));
      const baseUrl = getBaseUrl().replace(/\/$/, '');
      let url = `${baseUrl}/api/trpc/${endpoint}?input=${encodedInput}`;
      
      let cacheBuster: number;
      if (updatedAt) {
        const timestamp = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
        cacheBuster = timestamp && !isNaN(timestamp.getTime()) ? timestamp.getTime() : Date.now();
      } else {
        cacheBuster = Date.now();
      }
      
      const randomComponent = Math.floor(Math.random() * 1000);
      url += `&v=${cacheBuster}&r=${randomComponent}`;
      
      return url;
    } catch (error) {
      console.error('Error creating cache-busted URL:', error, { filePath: trimmedPath, updatedAt, variantType });
      return getImageUrl(trimmedPath, variantType);
    }
  } catch (error) {
    console.error('Error in getCacheBustedImageUrl:', error, { filePath: trimmedPath, updatedAt, variantType });
    return '';
  }
}

// Generate verification URL for image accessibility testing - simplified
export function getVerificationImageUrl(
  filePath: string
): string {
  if (!filePath || !isValidImagePath(filePath)) {
    console.warn('getVerificationImageUrl called with invalid filePath:', filePath);
    return '';
  }
  
  try {
    // Use cache-busted URL
    const baseUrl = getCacheBustedImageUrl(filePath, new Date());
    
    // Add verification-specific parameters
    const separator = baseUrl.includes('?') ? '&' : '?';
    const verificationParams = [
      `verify=1`,
      `ts=${Date.now()}`, // Ensure uniqueness
    ].join('&');
    
    return `${baseUrl}${separator}${verificationParams}`;
  } catch (error) {
    console.error('Error creating verification URL:', error, { filePath });
    return getImageUrl(filePath);
  }
}

// Test image accessibility - simplified
export async function testImageAccessibility(
  filePath: string
): Promise<{
  accessible: boolean;
  error?: string;
  loadTime?: number;
  imageSize?: { width: number; height: number };
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const img = new Image();
    let resolved = false;
    const defaultTimeout = 10000; // Default 10s timeout
    
    const cleanup = () => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    };
    
    const resolveOnce = (result: any) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(result);
    };
    
    const timeoutId = setTimeout(() => {
      resolveOnce({
        accessible: false,
        error: `Timeout after ${defaultTimeout}ms`,
        loadTime: Date.now() - startTime,
      });
    }, defaultTimeout);
    
    img.onload = () => {
      clearTimeout(timeoutId);
      resolveOnce({
        accessible: true,
        loadTime: Date.now() - startTime,
        imageSize: {
          width: img.naturalWidth,
          height: img.naturalHeight,
        },
      });
    };
    
    img.onerror = (error) => {
      clearTimeout(timeoutId);
      resolveOnce({
        accessible: false,
        error: `Load error: ${error}`,
        loadTime: Date.now() - startTime,
      });
    };
    
    img.crossOrigin = 'anonymous';
    img.src = getVerificationImageUrl(filePath); // Use simplified verification URL
  });
}

// Utility functions for connection state management
export function isConnectionStable(): boolean {
  if (typeof navigator === 'undefined') return true;
  
  if (!navigator.onLine) return false;
  
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      const slowConnections = ['slow-2g', '2g'];
      if (slowConnections.includes(connection.effectiveType)) {
        return false;
      }
      if (connection.saveData) {
        return false;
      }
    }
  }
  
  return true;
}

// Get absolute image URL for debugging purposes with comprehensive null safety
export function getAbsoluteImageUrl(filePath: string | null | undefined, variantType?: string): string {
  try {
    // Early validation with null safety
    if (!filePath || typeof filePath !== 'string') {
      return '';
    }
    
    const trimmedPath = filePath.trim();
    if (trimmedPath.length === 0) {
      return '';
    }
    
    const url = getImageUrl(trimmedPath, variantType);
    
    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If empty or invalid, return empty
    if (!url || url.trim() === '') {
      return '';
    }
    
    // Make relative URL absolute using the proper base URL function
    const baseUrl = getBaseUrl();
    return `${baseUrl}${url}`;
  } catch (error) {
    console.warn('Error in getAbsoluteImageUrl:', error, { filePath, variantType });
    return '';
  }
}

// Validate and normalize image URLs for consistent handling with comprehensive null safety
export function normalizeImageUrl(url: string | null | undefined): string {
  try {
    // Early validation with null safety
    if (!url || typeof url !== 'string') {
      return '';
    }
    
    const trimmedUrl = url.trim();
    if (trimmedUrl.length === 0) {
      return '';
    }
    
    // If it's a relative URL starting with /api/trpc, make it absolute
    if (trimmedUrl.startsWith('/api/trpc/')) {
      const baseUrl = getBaseUrl();
      return `${baseUrl}${trimmedUrl}`;
    }
    
    // If it's already absolute or a data URL, return as-is
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://') || trimmedUrl.startsWith('data:')) {
      return trimmedUrl;
    }
    
    // For other relative URLs, make them absolute
    const baseUrl = getBaseUrl();
    return new URL(trimmedUrl, baseUrl).toString();
  } catch (error) {
    console.warn('Error normalizing image URL:', error, { url });
    return url || '';
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

// Format dates for consistent display with comprehensive null safety
export function formatDate(date: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions): string {
  try {
    // Early validation with null safety
    if (!date) {
      return '';
    }
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = new Date(date);
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date string provided to formatDate:', date);
        return '';
      }
    } else if (date instanceof Date) {
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid Date object provided to formatDate:', date);
        return '';
      }
      dateObj = date;
    } else {
      console.warn('Invalid date type provided to formatDate:', { date, type: typeof date });
      return '';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    
    return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(dateObj);
  } catch (error) {
    console.warn('Error formatting date:', error, { date, options });
    return '';
  }
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
