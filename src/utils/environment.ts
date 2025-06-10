/**
 * Environment detection utilities for consistent runtime environment checks
 * throughout the application. This helps prevent errors when code designed for
 * browser environments runs on the server or vice versa.
 */

/**
 * Check if code is running in a browser environment
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' && 
         typeof navigator !== 'undefined';
};

/**
 * Check if code is running on the server (Node.js)
 */
export const isServer = (): boolean => {
  return !isBrowser();
};

/**
 * Check if code is running in a development environment
 */
export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

/**
 * Check if code is running in a production environment
 */
export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if code is running in a test environment
 */
export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test';
};

/**
 * Information about the current runtime environment
 */
export const environmentInfo = {
  isBrowser: isBrowser(),
  isServer: isServer(),
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
  isTest: isTest(),
  nodeVersion: isServer() ? process.version : undefined,
  userAgent: isBrowser() ? navigator.userAgent : undefined
};

/**
 * Execute code only in browser environment
 * @param fn Function to execute in browser environment
 * @returns The result of the function or undefined if not in browser
 */
export function browserOnly<T>(fn: () => T): T | undefined {
  if (isBrowser()) {
    return fn();
  }
  return undefined;
}

/**
 * Execute code only in server environment
 * @param fn Function to execute in server environment
 * @returns The result of the function or undefined if not on server
 */
export function serverOnly<T>(fn: () => T): T | undefined {
  if (isServer()) {
    return fn();
  }
  return undefined;
}

/**
 * Safe access to window object that works in all environments
 * @param accessor Function that accesses window
 * @param fallback Fallback value if window is undefined
 */
export function safeWindow<T>(accessor: (w: Window) => T, fallback: T): T {
  if (isBrowser()) {
    try {
      return accessor(window);
    } catch (e) {
      console.warn('Error accessing window:', e);
      return fallback;
    }
  }
  return fallback;
}

/**
 * Log information appropriate to the current environment
 */
export function envAwareLog(message: string, data?: any): void {
  if (isDevelopment()) {
    if (isBrowser()) {
      console.log(`🌐 CLIENT: ${message}`, data);
    } else {
      console.log(`🖥️ SERVER: ${message}`, data);
    }
  }
}

/**
 * Get a value that might differ between client and server environments
 */
export function getEnvAwareValue<T>(clientValue: T, serverValue: T): T {
  return isBrowser() ? clientValue : serverValue;
}
