/**
 * File and Blob polyfill for server-side rendering
 * This is needed because File and Blob are browser-specific APIs not available in Node.js
 */

// Create mock classes for server-side usage
export class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;

  constructor(
    bits: Array<any> | ArrayBuffer,
    name: string,
    options?: { type?: string; lastModified?: number }
  ) {
    this.name = name;
    this.size = 0;
    this.type = options?.type || '';
    this.lastModified = options?.lastModified || Date.now();
  }
}

export class MockBlob {
  size: number;
  type: string;

  constructor(bits?: Array<any>, options?: { type?: string }) {
    this.size = 0;
    this.type = options?.type || '';
  }
}

// Function to check if code is running in browser
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

// Get appropriate file class based on environment
export const SafeFile = isBrowser() ? (window as any).File : MockFile;
export const SafeBlob = isBrowser() ? (window as any).Blob : MockBlob;

// Safe instanceof check for File and Blob
export function isFile(obj: any): boolean {
  if (!isBrowser()) return obj instanceof MockFile;
  return obj instanceof File;
}

export function isBlob(obj: any): boolean {
  if (!isBrowser()) return obj instanceof MockBlob;
  return obj instanceof Blob;
}
