/**
 * Type safety utilities to improve error handling and TypeScript compliance
 * throughout the application.
 */

/**
 * Safely access potentially undefined properties in objects
 * @param obj The object to access a property from
 * @param key The property key to access
 * @param fallback Optional fallback value if property is undefined
 * @returns The property value or fallback
 */
export function safeGet<T, K extends keyof T>(obj: T | null | undefined, key: K, fallback?: T[K]): T[K] | undefined {
  if (obj == null) return fallback;
  return obj[key] !== undefined ? obj[key] : fallback;
}

/**
 * Type guard to check if a value is not null or undefined
 * @param value Value to check
 * @returns True if the value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Safely parse JSON with type checking
 * @param jsonString JSON string to parse
 * @param fallback Optional fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(jsonString: string | null | undefined, fallback?: T): T | undefined {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Safely access array elements with bounds checking
 * @param array Array to access
 * @param index Index to access
 * @param fallback Optional fallback value if index is out of bounds
 * @returns Array element or fallback
 */
export function safeArrayAccess<T>(array: T[] | null | undefined, index: number, fallback?: T): T | undefined {
  if (!array || index < 0 || index >= array.length) return fallback;
  return array[index];
}

/**
 * Assert that a value is defined (not null or undefined), throwing an error if it's not
 * @param value Value to check
 * @param errorMessage Optional error message
 * @returns The value if it's defined
 */
export function assertDefined<T>(value: T | null | undefined, errorMessage = 'Value is undefined'): T {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
  return value;
}

/**
 * Create a type-safe event handler with error handling
 * @param handler The event handler function
 * @returns A wrapped handler with error handling
 */
export function typeSafeEventHandler<E extends Event = Event>(
  handler: (e: E) => void | Promise<void>
): (e: E) => void {
  return (e: E) => {
    try {
      const result = handler(e);
      if (result instanceof Promise) {
        result.catch(error => {
          console.error('Error in async event handler:', error);
        });
      }
    } catch (error) {
      console.error('Error in event handler:', error);
    }
  };
}

/**
 * A TypeScript-friendly dictionary type
 */
export type Dictionary<T> = {
  [key: string]: T;
};
