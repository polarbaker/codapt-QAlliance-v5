/**
 * Specialized error handling utilities for file operations, focusing on
 * robust error management for file uploads and processing.
 */
import '../polyfill'; // Ensure File and Blob are available in all environments

/**
 * File operation error class with enhanced context and recovery options
 */
export class FileOperationError extends Error {
  public readonly code: string;
  public readonly recoverable: boolean;
  public readonly context: Record<string, unknown>;
  public readonly suggestions: string[];
  public readonly originalError?: Error;
  
  constructor(
    message: string,
    options: {
      code?: string,
      recoverable?: boolean,
      context?: Record<string, unknown>,
      suggestions?: string[],
      originalError?: Error
    } = {}
  ) {
    super(message);
    this.name = 'FileOperationError';
    this.code = options.code || 'UNKNOWN_FILE_ERROR';
    this.recoverable = options.recoverable ?? false;
    this.context = options.context || {};
    this.suggestions = options.suggestions || [];
    this.originalError = options.originalError;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, FileOperationError.prototype);
  }
  
  /**
   * Format the error for display to users
   */
  public toUserMessage(): string {
    let message = `${this.message}`;
    
    if (this.suggestions.length > 0) {
      message += '\n\nSuggestions:';
      this.suggestions.forEach((suggestion, index) => {
        message += `\n${index + 1}. ${suggestion}`;
      });
    }
    
    return message;
  }
  
  /**
   * Format the error for logging (includes technical details)
   */
  public toLogMessage(): string {
    const context = Object.keys(this.context).length > 0
      ? `\nContext: ${JSON.stringify(this.context, null, 2)}`
      : '';
      
    const originalErrorMsg = this.originalError
      ? `\nOriginal Error: ${this.originalError.message}`
      : '';
      
    return `FileOperationError [${this.code}]: ${this.message}${context}${originalErrorMsg}`;
  }
}

/**
 * Validate file size and throw a consistent error if too large
 */
export function validateFileSize(file: File | Blob, maxSizeInBytes: number): void {
  if (file.size > maxSizeInBytes) {
    const sizeMB = file.size / (1024 * 1024);
    const maxSizeMB = maxSizeInBytes / (1024 * 1024);
    
    throw new FileOperationError(
      `File size exceeds maximum allowed size (${sizeMB.toFixed(1)}MB > ${maxSizeMB.toFixed(1)}MB).`,
      {
        code: 'FILE_TOO_LARGE',
        recoverable: true,
        context: {
          fileSize: file.size,
          maxSize: maxSizeInBytes,
          fileSizeMB: sizeMB,
          maxSizeMB: maxSizeMB
        },
        suggestions: [
          'Reduce the file size before uploading',
          'Compress the image using an image optimization tool',
          'Try uploading a different file'
        ]
      }
    );
  }
}

/**
 * Validate file type against allowed MIME types
 */
export function validateFileType(file: File | Blob, allowedMimeTypes: string[]): void {
  // Get MIME type, handling both File and Blob objects
  const mimeType = 'type' in file ? file.type : '';
  
  if (!mimeType || !allowedMimeTypes.some(allowed => mimeType.match(new RegExp(allowed)))) {
    throw new FileOperationError(
      `File type ${mimeType || 'unknown'} is not supported.`,
      {
        code: 'UNSUPPORTED_FILE_TYPE',
        recoverable: true,
        context: {
          actualType: mimeType || 'unknown',
          allowedTypes: allowedMimeTypes
        },
        suggestions: [
          'Upload a file with one of the supported formats',
          `Supported formats: ${allowedMimeTypes.join(', ')}`
        ]
      }
    );
  }
}

/**
 * Safely read a file as a data URL with error handling
 */
export function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new FileOperationError('Failed to read file as data URL', {
            code: 'FILE_READ_ERROR',
            recoverable: false
          }));
        }
      };
      
      reader.onerror = () => {
        reject(new FileOperationError('Error reading file', {
          code: 'FILE_READ_ERROR',
          recoverable: true,
          originalError: reader.error || undefined,
          suggestions: ['Try uploading the file again']
        }));
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      reject(new FileOperationError('Exception while reading file', {
        code: 'FILE_READ_EXCEPTION',
        recoverable: true,
        originalError: error instanceof Error ? error : undefined,
        suggestions: ['Try uploading the file again', 'Ensure the file is not corrupted']
      }));
    }
  });
}

/**
 * Safe wrapper for File and Blob creation that works in all environments
 */
export function createSafeFile(
  parts: BlobPart[],
  fileName: string,
  options?: BlobPropertyBag
): File {
  // Ensure we're in an environment with File support
  if (typeof File !== 'undefined') {
    try {
      return new File(parts, fileName, options);
    } catch (error) {
      console.warn('File constructor failed, falling back to Blob', error);
      // Fall through to Blob fallback
    }
  }
  
  // Fallback to Blob with manually attached properties
  const blob = new Blob(parts, options);
  
  // Extend the Blob to mimic a File as closely as possible
  Object.defineProperties(blob, {
    name: {
      value: fileName,
      writable: false
    },
    lastModified: {
      value: Date.now(),
      writable: false
    }
  });
  
  return blob as unknown as File;
}

/**
 * Wrap async file operations with consistent error handling
 */
export function withFileErrorHandling<T>(
  operation: () => Promise<T>,
  errorContext: Record<string, unknown> = {}
): Promise<T> {
  return operation().catch((error: unknown) => {
    // If it's already our custom error type, just add context
    if (error instanceof FileOperationError) {
      // Create a new error with merged context instead of modifying read-only property
      const newError = new FileOperationError(
        error.message,
        {
          code: error.code,
          recoverable: error.recoverable,
          context: { ...error.context, ...errorContext },
          suggestions: [...error.suggestions],
          originalError: error.originalError
        }
      );
      throw newError;
    }
    
    // Convert other errors to our custom format
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new FileOperationError(
      `File operation failed: ${errorMessage}`,
      {
        code: 'FILE_OPERATION_FAILED',
        recoverable: true,
        originalError: error instanceof Error ? error : undefined,
        context: errorContext,
        suggestions: ['Try the operation again', 'Refresh the page and try again']
      }
    );
  });
}
