/**
 * Global polyfills for browser-only APIs when running in Node.js
 * This provides TypeScript-friendly implementations of browser APIs
 * that may be referenced during server-side rendering or API execution.
 * 
 * IMPORTANT: This should be imported at the very top of every entry point
 * that might run on the server before any other imports.
 */

// Environment detection with explicit type checking
const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' && 
         typeof navigator !== 'undefined';
};

// Only apply polyfills if we're NOT in a browser environment
if (!isBrowser()) {
  console.info('🔧 Applying browser API polyfills for server environment');
  
  /**
   * TypeScript-friendly implementation of the File API for Node.js environments
   * @see https://developer.mozilla.org/en-US/docs/Web/API/File
   */
  if (typeof File === 'undefined') {
    class NodeFile {
      name: string;
      lastModified: number;
      size: number;
      type: string;
      webkitRelativePath: string = '';
      private _parts: Array<Uint8Array>;

      constructor(bits: Array<BlobPart> = [], filename: string, options: FilePropertyBag = {}) {
        this.name = filename;
        this.lastModified = options.lastModified || Date.now();
        this._parts = bits.map(part => {
          if (typeof part === 'string') {
            return new TextEncoder().encode(part);
          }
          return new Uint8Array(
            part instanceof ArrayBuffer ? part : 
            part instanceof Uint8Array ? part.buffer : 
            new ArrayBuffer(0)
          );
        });
        
        this.type = options.type || '';
        // Calculate size from parts
        this.size = this._parts.reduce((size, part) => size + part.length, 0);
      }

      slice(start?: number, end?: number, contentType?: string): Blob {
        // Return a minimal working implementation
        return new (globalThis.Blob || NodeBlob)(
          [], 
          { type: contentType || this.type }
        );
      }

      stream(): ReadableStream<Uint8Array> {
        throw new Error('Stream API not available in this environment');
      }

      text(): Promise<string> {
        return Promise.resolve('');
      }

      arrayBuffer(): Promise<ArrayBuffer> {
        return Promise.resolve(new ArrayBuffer(0));
      }
    }

    // Assign to global namespace with correct TypeScript typing
    (globalThis as any).File = NodeFile as unknown as typeof File;
  }

  /**
   * TypeScript-friendly implementation of the Blob API for Node.js environments
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Blob
   */
  class NodeBlob {
    size: number;
    type: string;
    // Add properties required by TypeScript Blob interface
    [Symbol.toStringTag]: string = 'Blob';
    // Use correct signature for bytes() method in the Blob interface
    bytes(): Promise<Uint8Array> { 
      // Concatenate all parts into a single Uint8Array
      const totalLength = this._parts.reduce((sum, part) => sum + part.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of this._parts) {
        result.set(part, offset);
        offset += part.length;
      }
      return Promise.resolve(result);
    }
    private _parts: Array<Uint8Array>;

    constructor(bits: Array<BlobPart> = [], options: BlobPropertyBag = {}) {
      this._parts = bits.map(part => {
        if (typeof part === 'string') {
          return new TextEncoder().encode(part);
        }
        return new Uint8Array(
          part instanceof ArrayBuffer ? part : 
          part instanceof Uint8Array ? part.buffer : 
          new ArrayBuffer(0)
        );
      });
      
      this.type = options.type || '';
      // Calculate size from parts
      this.size = this._parts.reduce((size, part) => size + part.length, 0);
    }

    slice(start?: number, end?: number, contentType?: string): Blob {
      return new NodeBlob([], { type: contentType || this.type });
    }

    stream(): ReadableStream<Uint8Array> {
      throw new Error('Stream API not available in this environment');
    }

    text(): Promise<string> {
      return Promise.resolve('');
    }

    arrayBuffer(): Promise<ArrayBuffer> {
      return Promise.resolve(new ArrayBuffer(0));
    }
  }

  // Only define Blob if it doesn't exist already
  if (typeof Blob === 'undefined') {
    // Assign to global namespace with correct TypeScript typing
    (globalThis as any).Blob = NodeBlob as unknown as typeof Blob;
  }
  
  // Polyfill URL API if needed
  if (typeof URL === 'undefined') {
    class NodeURL {
      hash: string = '';
      host: string = '';
      hostname: string = '';
      href: string;
      origin: string = '';
      password: string = '';
      pathname: string = '';
      port: string = '';
      protocol: string = '';
      search: string = '';
      searchParams: URLSearchParams = new URLSearchParams();
      username: string = '';
      
      constructor(url: string, base?: string) {
        this.href = url;
      }
      
      toString(): string {
        return this.href;
      }
      
      toJSON(): string {
        return this.href;
      }
    }
    
    // Assign to global namespace
    if (typeof URLSearchParams === 'undefined') {
      (globalThis as any).URLSearchParams = class NodeURLSearchParams {
        constructor(init?: string | URLSearchParams) {}
        append() {}
        delete() {}
        get(): string | null { return null; }
        getAll(): string[] { return []; }
        has(): boolean { return false; }
        set() {}
        sort() {}
        toString(): string { return ''; }
        keys(): IterableIterator<string> { return [][Symbol.iterator](); }
        values(): IterableIterator<string> { return [][Symbol.iterator](); }
        entries(): IterableIterator<[string, string]> { return [][Symbol.iterator](); }
        forEach() {}
      } as unknown as typeof URLSearchParams;
    }
    
    // Only set URL if it doesn't exist
    (globalThis as any).URL = NodeURL as unknown as typeof URL;
  }
  
  // Additional browser API stubs that might be needed
  if (typeof HTMLCanvasElement === 'undefined') {
    (globalThis as any).HTMLCanvasElement = class {};
  }
  
  if (typeof HTMLImageElement === 'undefined') {
    (globalThis as any).HTMLImageElement = class {};
  }
  
  if (typeof Image === 'undefined') {
    (globalThis as any).Image = class {
      width: number = 0;
      height: number = 0;
      complete: boolean = false;
      src: string = '';
      addEventListener() {}
      removeEventListener() {}
    };
  }
  
  if (typeof FileReader === 'undefined') {
    (globalThis as any).FileReader = class {
      readyState: number = 0;
      result: string | ArrayBuffer | null = null;
      error: Error | null = null;
      onload: ((this: FileReader, ev: ProgressEvent) => any) | null = null;
      onerror: ((this: FileReader, ev: ProgressEvent) => any) | null = null;
      readAsArrayBuffer() {}
      readAsBinaryString() {}
      readAsDataURL() {}
      readAsText() {}
      abort() {}
    };
  }
}
export {};
