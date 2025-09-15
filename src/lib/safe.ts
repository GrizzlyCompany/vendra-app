/**
 * Defensive programming utilities for safer operations
 */

// Type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

export function isValidUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Safe accessors
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

export function safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  return isArray(value) ? value as T[] : defaultValue;
}

export function safeString(value: unknown, defaultValue = ''): string {
  return isString(value) ? value : defaultValue;
}

export function safeNumber(value: unknown, defaultValue = 0): number {
  return isNumber(value) ? value : defaultValue;
}

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