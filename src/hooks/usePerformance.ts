"use client";

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { safeNumber, safeString } from "@/lib/safe";

// Performance monitoring interface
interface PerformanceMetrics {
  renderTime: number;
  lastUpdate: number;
  renderCount: number;
  averageRenderTime: number;
}

// Enhanced performance hook with monitoring
export function usePerformanceMonitor(componentName = 'Component'): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    lastUpdate: Date.now(),
    renderCount: 0,
    averageRenderTime: 0
  });
  
  const renderStartTime = useRef<number>(0);
  const totalRenderTime = useRef<number>(0);
  
  useEffect(() => {
    renderStartTime.current = performance.now();
  });
  
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    totalRenderTime.current += renderTime;
    
    setMetrics(prev => {
      const newRenderCount = prev.renderCount + 1;
      return {
        renderTime,
        lastUpdate: Date.now(),
        renderCount: newRenderCount,
        averageRenderTime: totalRenderTime.current / newRenderCount
      };
    });
    
    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }, [componentName]);
  
  return metrics;
}

// Hook para memoizar funciones costosas con debugging
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debugName?: string
): T {
  return useCallback(((...args: any[]) => {
    const start = performance.now();
    const result = callback(...args);
    const duration = performance.now() - start;
    
    if (process.env.NODE_ENV === 'development' && duration > 10 && debugName) {
      console.warn(`Slow callback execution in ${debugName}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }) as T, deps);
}

// Hook para memoizar valores computados costosos con profiling
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList,
  debugName?: string
): T {
  return useMemo(() => {
    const start = performance.now();
    const result = factory();
    const duration = performance.now() - start;
    
    if (process.env.NODE_ENV === 'development' && duration > 5 && debugName) {
      console.warn(`Slow memoized computation in ${debugName}: ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }, deps);
}

// Enhanced debounce with performance tracking
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  debugName?: string
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callCountRef = useRef(0);
  const executionCountRef = useRef(0);
  
  return useMemoizedCallback(
    ((...args: Parameters<T>) => {
      callCountRef.current++;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        executionCountRef.current++;
        const start = performance.now();
        callback(...args);
        const duration = performance.now() - start;
        
        if (process.env.NODE_ENV === 'development' && debugName) {
          const efficiency = (executionCountRef.current / callCountRef.current) * 100;
          if (duration > 10) {
            console.warn(`Slow debounced callback in ${debugName}: ${duration.toFixed(2)}ms`);
          }
          if (efficiency < 50) {
            console.info(`Debounce efficiency in ${debugName}: ${efficiency.toFixed(1)}%`);
          }
        }
      }, safeNumber(delay, 300));

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }) as T,
    [callback, delay, debugName]
  );
}

// Enhanced throttling with performance metrics
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  debugName?: string
): T {
  const lastCallRef = useRef(0);
  const callCountRef = useRef(0);
  const executionCountRef = useRef(0);

  return useMemoizedCallback(
    ((...args: Parameters<T>) => {
      callCountRef.current++;
      const now = Date.now();
      
      if (now - lastCallRef.current >= safeNumber(delay, 100)) {
        lastCallRef.current = now;
        executionCountRef.current++;
        
        const start = performance.now();
        const result = callback(...args);
        const duration = performance.now() - start;
        
        if (process.env.NODE_ENV === 'development' && debugName) {
          const efficiency = (executionCountRef.current / callCountRef.current) * 100;
          if (duration > 10) {
            console.warn(`Slow throttled callback in ${debugName}: ${duration.toFixed(2)}ms`);
          }
          if (efficiency > 80) {
            console.info(`High throttle frequency in ${debugName}: ${efficiency.toFixed(1)}%`);
          }
        }
        
        return result;
      }
    }) as T,
    [callback, delay, debugName]
  );
}
