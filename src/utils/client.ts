import { getVerificationImageUrl } from './common';

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
