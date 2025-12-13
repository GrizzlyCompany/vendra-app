"use client";

import { useEffect, useRef, useCallback } from 'react';

/**
 * Performance monitoring hook with advanced metrics and caching
 */
export function usePerformanceMonitor(componentName?: string) {
  const startTimeRef = useRef<number | undefined>(undefined);
  const renderCountRef = useRef(0);
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
    lastRenderTime: 0,
    memoryUsage: 0,
    componentName: componentName || 'Unknown'
  });

  // Start performance measurement
  const startMeasurement = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  // End performance measurement
  const endMeasurement = useCallback(() => {
    if (!startTimeRef.current) return;

    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;

    renderCountRef.current += 1;

    const metrics = metricsRef.current;
    metrics.renderCount = renderCountRef.current;
    metrics.lastRenderTime = renderTime;
    metrics.totalRenderTime += renderTime;
    metrics.averageRenderTime = metrics.totalRenderTime / metrics.renderCount;

    // Log performance in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metrics.componentName}:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        averageTime: `${metrics.averageRenderTime.toFixed(2)}ms`,
        renderCount: metrics.renderCount
      });
    }

    startTimeRef.current = undefined;
  }, []);

  // Measure component render performance
  useEffect(() => {
    startMeasurement();

    return () => {
      endMeasurement();
    };
  });

  // Get current performance metrics
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    metricsRef.current = {
      renderCount: 0,
      averageRenderTime: 0,
      totalRenderTime: 0,
      lastRenderTime: 0,
      memoryUsage: 0,
      componentName: componentName || 'Unknown'
    };
  }, [componentName]);

  return {
    startMeasurement,
    endMeasurement,
    getMetrics,
    resetMetrics
  };
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  renderCount: number;
  averageRenderTime: number;
  totalRenderTime: number;
  lastRenderTime: number;
  memoryUsage: number;
  componentName: string;
}

/**
 * Advanced caching hook with TTL and size limits
 */
export function useCache<T>(
  key: string,
  options: {
    ttl?: number; // Time to live in milliseconds
    maxSize?: number; // Maximum cache size
    strategy?: 'lru' | 'fifo'; // Cache eviction strategy
  } = {}
) {
  const { ttl = 5 * 60 * 1000, maxSize = 100, strategy = 'lru' } = options;
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  const get = useCallback((cacheKey: string): T | null => {
    const entry = cacheRef.current.get(cacheKey);

    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > ttl) {
      cacheRef.current.delete(cacheKey);
      return null;
    }

    // Update access time for LRU
    if (strategy === 'lru') {
      entry.lastAccessed = Date.now();
    }

    return entry.data;
  }, [ttl, strategy]);

  const set = useCallback((cacheKey: string, data: T) => {
    // Check cache size limit
    if (cacheRef.current.size >= maxSize) {
      evictCache();
    }

    cacheRef.current.set(cacheKey, {
      data,
      timestamp: Date.now(),
      lastAccessed: Date.now()
    });
  }, [maxSize]);

  const remove = useCallback((cacheKey: string) => {
    cacheRef.current.delete(cacheKey);
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const evictCache = useCallback(() => {
    if (strategy === 'lru') {
      // Remove least recently used
      let oldestKey: string | null = null;
      let oldestTime = Date.now();

      for (const [key, entry] of cacheRef.current.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        cacheRef.current.delete(oldestKey);
      }
    } else {
      // FIFO: Remove oldest entry
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) {
        cacheRef.current.delete(firstKey);
      }
    }
  }, [strategy]);

  // Clean up expired entries periodically
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      for (const [key, entry] of cacheRef.current.entries()) {
        if (now - entry.timestamp > ttl) {
          cacheRef.current.delete(key);
        }
      }
    };

    const interval = setInterval(cleanup, ttl / 4); // Clean every quarter of TTL
    return () => clearInterval(interval);
  }, [ttl]);

  return {
    get: (cacheKey?: string) => get(cacheKey || key),
    set: (data: T, cacheKey?: string) => set(cacheKey || key, data),
    remove: (cacheKey?: string) => remove(cacheKey || key),
    clear,
    size: () => cacheRef.current.size
  };
}

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccessed: number;
}

/**
 * Bundle analysis and code splitting utilities
 */
export function useBundleAnalyzer() {
  const analyzeBundle = useCallback(async () => {
    if (process.env.NODE_ENV !== 'development') return null;

    try {
      // This would integrate with webpack-bundle-analyzer in a real setup
      const bundleData = await fetch('/_next/static/chunks/webpack-bundle-analyzer.json')
        .then(res => res.json())
        .catch(() => null);

      return bundleData;
    } catch (error) {
      console.warn('Bundle analysis not available:', error);
      return null;
    }
  }, []);

  const getBundleMetrics = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const scripts = resources.filter(entry => entry.name.includes('.js'));

    const totalSize = scripts.reduce((sum, script) => sum + script.transferSize, 0);
    const totalTime = scripts.reduce((sum, script) => sum + script.duration, 0);

    return {
      scriptCount: scripts.length,
      totalSize,
      averageSize: totalSize / scripts.length,
      totalLoadTime: totalTime,
      averageLoadTime: totalTime / scripts.length,
      largestScript: Math.max(...scripts.map(s => s.transferSize))
    };
  }, []);

  return {
    analyzeBundle,
    getBundleMetrics
  };
}

/**
 * Memory usage monitoring hook
 */
export function useMemoryMonitor() {
  const getMemoryUsage = useCallback(() => {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usagePercent: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
    };
  }, []);

  const monitorMemoryLeak = useCallback((threshold = 50 * 1024 * 1024) => {
    let lastMemoryUsage = 0;
    let leakCount = 0;

    const checkLeak = () => {
      const currentUsage = getMemoryUsage()?.used || 0;

      if (lastMemoryUsage > 0 && currentUsage - lastMemoryUsage > threshold) {
        leakCount++;
        console.warn(`[Memory Leak Detected] Usage increased by ${(currentUsage - lastMemoryUsage) / 1024 / 1024}MB`);

        if (leakCount > 3) {
          console.error('[Memory Leak] Multiple memory leaks detected. Consider optimizing your components.');
        }
      }

      lastMemoryUsage = currentUsage;
    };

    const interval = setInterval(checkLeak, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [getMemoryUsage]);

  return {
    getMemoryUsage,
    monitorMemoryLeak
  };
}

/**
 * Network performance monitoring
 */
export function useNetworkMonitor() {
  const connectionRef = useRef<any>(null);

  useEffect(() => {
    if ('connection' in navigator) {
      connectionRef.current = (navigator as any).connection;
    }
  }, []);

  const getNetworkInfo = useCallback(() => {
    if (!connectionRef.current) return null;

    return {
      effectiveType: connectionRef.current.effectiveType,
      downlink: connectionRef.current.downlink,
      rtt: connectionRef.current.rtt,
      saveData: connectionRef.current.saveData
    };
  }, []);

  const isSlowConnection = useCallback(() => {
    const info = getNetworkInfo();
    return info ? info.effectiveType === 'slow-2g' || info.effectiveType === '2g' : false;
  }, [getNetworkInfo]);

  const shouldReduceQuality = useCallback(() => {
    const info = getNetworkInfo();
    return info ? info.saveData || info.downlink < 1 : false;
  }, [getNetworkInfo]);

  return {
    getNetworkInfo,
    isSlowConnection,
    shouldReduceQuality
  };
}

/**
 * Web Vitals monitoring hook
 */
export function useWebVitals() {
  const reportWebVitals = useCallback((metric: any) => {
    // Send to analytics service
    console.log('[Web Vitals]', metric);

    // In a real app, you would send this to your analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.value),
        event_category: 'Web Vitals',
        event_label: metric.id,
        non_interaction: true,
      });
    }
  }, []);

  useEffect(() => {
    // Web Vitals monitoring would be implemented here with optional library
    // For now, just log basic performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance] Web Vitals monitoring ready');
    }
  }, [reportWebVitals]);

  return { reportWebVitals };
}