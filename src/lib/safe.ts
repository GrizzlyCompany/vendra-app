/**
 * @fileoverview Defensive programming utilities for safer operations
 * @description This module provides type-safe utility functions for common operations
 * that help prevent runtime errors and handle edge cases gracefully.
 *
 * @example
 * ```typescript
 * import { safeString, safeNumber, safeGet } from '@/lib/safe';
 *
 * // Safe string conversion
 * const name = safeString(userInput, 'Anonymous');
 *
 * // Safe number parsing
 * const age = safeNumber(formData.age, 0);
 *
 * // Safe object property access
 * const email = safeGet(user, 'profile.email', 'no-email@example.com');
 * ```
 */

/**
 * Type guard functions for runtime type checking
 */

/**
 * Checks if a value is a string
 * @param value - The value to check
 * @returns True if the value is a string, false otherwise
 *
 * @example
 * ```typescript
 * if (isString(input)) {
 *   console.log(input.toUpperCase()); // TypeScript knows input is string
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks if a value is a valid number (not NaN or Infinity)
 * @param value - The value to check
 * @returns True if the value is a finite number, false otherwise
 *
 * @example
 * ```typescript
 * const result = isNumber(parseFloat(input));
 * if (result) {
 *   // Safe to use as number
 * }
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Checks if a value is a plain object (not null, not array)
 * @param value - The value to check
 * @returns True if the value is a plain object, false otherwise
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Checks if a value is an array
 * @param value - The value to check
 * @returns True if the value is an array, false otherwise
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Checks if a value is a valid URL string
 * @param value - The value to check
 * @returns True if the value is a valid URL, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidUrl(imageSrc)) {
 *   // Safe to use in img src
 * }
 * ```
 */
export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a value is a valid email address
 * @param value - The value to check
 * @returns True if the value matches email pattern, false otherwise
 */
export function isValidEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Checks if a value is a valid UUID v4 string
 * @param value - The value to check
 * @returns True if the value is a valid UUID, false otherwise
 */
export function isValidUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Safe accessor functions for defensive data access
 */

/**
 * Safely accesses nested object properties with a default fallback
 * @param obj - The object to access
 * @param path - Dot-separated path to the property (e.g., 'user.profile.email')
 * @param defaultValue - Value to return if path doesn't exist or is invalid
 * @returns The property value or default value
 *
 * @example
 * ```typescript
 * const email = safeGet(user, 'profile.contact.email', 'no-email@example.com');
 * const age = safeGet(person, 'details.age', 25);
 * ```
 */
export function safeGet<T>(
  obj: unknown,
  path: string,
  defaultValue: T
): T {
  if (!isObject(obj)) return defaultValue;

  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (!isObject(current) || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current ?? defaultValue;
}

/**
 * Safely converts a value to an array with type checking
 * @param value - The value to convert
 * @param defaultValue - Default array to return if value is not an array
 * @returns The array or default value
 *
 * @example
 * ```typescript
 * const tags = safeArray(property.tags, []);
 * const images = safeArray(property.images, ['default.jpg']);
 * ```
 */
export function safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  return isArray(value) ? value as T[] : defaultValue;
}

/**
 * Safely converts a value to a string
 * @param value - The value to convert
 * @param defaultValue - Default string to return if conversion fails
 * @returns The string value or default
 *
 * @example
 * ```typescript
 * const title = safeString(property.title, 'Untitled Property');
 * const description = safeString(property.description, '');
 * ```
 */
export function safeString(value: unknown, defaultValue = ''): string {
  return isString(value) ? value : defaultValue;
}

/**
 * Safely converts a value to a number
 * @param value - The value to convert
 * @param defaultValue - Default number to return if conversion fails
 * @returns The number value or default
 *
 * @example
 * ```typescript
 * const price = safeNumber(property.price, 0);
 * const bedrooms = safeNumber(property.bedrooms, 1);
 * ```
 */
export function safeNumber(value: unknown, defaultValue = 0): number {
  return isNumber(value) ? value : defaultValue;
}

/**
 * Safely converts a value to a boolean
 * @param value - The value to convert
 * @param defaultValue - Default boolean to return if conversion fails
 * @returns The boolean value or default
 *
 * @example
 * ```typescript
 * const isActive = safeBoolean(property.isActive, false);
 * const hasParking = safeBoolean(property.hasParking, true);
 * ```
 */
export function safeBoolean(value: unknown, defaultValue = false): boolean {
  return typeof value === 'boolean' ? value : defaultValue;
}

// Safe operations
export function safeJsonParse<T>(
  json: string,
  defaultValue: T
): T {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export function safeJsonStringify(
  value: unknown,
  defaultValue = '{}'
): string {
  try {
    return JSON.stringify(value) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export function safePromise<T>(
  promise: Promise<T>,
  defaultValue: T
): Promise<T> {
  return promise.catch(() => defaultValue);
}

export async function safeAsync<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  onError?: (error: unknown) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    onError?.(error);
    return defaultValue;
  }
}

// Array operations
export function safeFilter<T>(
  array: unknown,
  predicate: (item: T) => boolean
): T[] {
  if (!isArray(array)) return [];
  return array.filter((item): item is T => {
    try {
      return predicate(item as T);
    } catch {
      return false;
    }
  });
}

export function safeMap<T, U>(
  array: unknown,
  mapper: (item: T, index: number) => U,
  defaultValue: U[] = []
): U[] {
  if (!isArray(array)) return defaultValue;
  
  try {
    return array.map((item, index) => mapper(item as T, index));
  } catch {
    return defaultValue;
  }
}

export function safeFind<T>(
  array: unknown,
  predicate: (item: T) => boolean,
  defaultValue?: T
): T | undefined {
  if (!isArray(array)) return defaultValue;
  
  try {
    return array.find((item): item is T => predicate(item as T)) ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

// Date operations
export function safeDateParse(value: unknown, defaultValue?: Date): Date | undefined {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value;
  }
  
  if (isString(value) || isNumber(value)) {
    try {
      const date = new Date(value);
      return !isNaN(date.getTime()) ? date : defaultValue;
    } catch {
      return defaultValue;
    }
  }
  
  return defaultValue;
}

export function safeFormatDate(
  date: unknown,
  options: Intl.DateTimeFormatOptions = {},
  locale = 'es-ES',
  defaultValue = 'Fecha no disponible'
): string {
  const safeDate = safeDateParse(date);
  if (!safeDate) return defaultValue;
  
  try {
    return safeDate.toLocaleDateString(locale, options);
  } catch {
    return defaultValue;
  }
}

// DOM operations
export function safeQuerySelector<T extends Element = Element>(
  selector: string,
  parent: ParentNode = document
): T | null {
  try {
    return parent.querySelector<T>(selector);
  } catch {
    return null;
  }
}

export function safeAddEventListener(
  element: EventTarget | null,
  event: string,
  handler: EventListener,
  options?: AddEventListenerOptions
): () => void {
  if (!element) return () => {};
  
  try {
    element.addEventListener(event, handler, options);
    return () => {
      try {
        element.removeEventListener(event, handler, options);
      } catch {
        // Ignore cleanup errors
      }
    };
  } catch {
    return () => {};
  }
}

// Local storage operations
export function safeLocalStorageGet<T>(
  key: string,
  defaultValue: T
): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? safeJsonParse(item, defaultValue) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function safeLocalStorageSet(key: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.setItem(key, safeJsonStringify(value));
    return true;
  } catch {
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// Error boundary helpers
export function withErrorBoundary<T extends (...args: any[]) => any>(
  fn: T,
  fallback: ReturnType<T>,
  onError?: (error: unknown, ...args: Parameters<T>) => void
): T {
  return ((...args: Parameters<T>) => {
    try {
      return fn(...args);
    } catch (error) {
      onError?.(error, ...args);
      return fallback;
    }
  }) as T;
}

// Network request helpers
export function safeFetch(
  url: string,
  options?: RequestInit,
  timeout = 10000
): Promise<Response> {
  if (!isValidUrl(url)) {
    return Promise.reject(new Error('Invalid URL'));
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, {
    ...options,
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

// Validation helpers
export function assertIsString(value: unknown, message = 'Value must be a string'): asserts value is string {
  if (!isString(value)) {
    throw new Error(message);
  }
}

export function assertIsNumber(value: unknown, message = 'Value must be a number'): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message);
  }
}

export function assertIsObject(value: unknown, message = 'Value must be an object'): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(message);
  }
}

export function assertIsArray(value: unknown, message = 'Value must be an array'): asserts value is unknown[] {
  if (!isArray(value)) {
    throw new Error(message);
  }
}