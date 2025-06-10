/**
 * Global polyfills for server-side rendering
 * This file should be imported at the entry point of the application
 */

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// If we're not in a browser, create global polyfills for File and Blob
if (!isBrowser) {
  // Create mock File class
  class MockFile {
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

  // Create mock Blob class
  class MockBlob {
    size: number;
    type: string;

    constructor(bits?: Array<any>, options?: { type?: string }) {
      this.size = 0;
      this.type = options?.type || '';
    }
  }

  // Assign to global scope
  globalThis.File = MockFile as any;
  globalThis.Blob = MockBlob as any;
}

export {};
