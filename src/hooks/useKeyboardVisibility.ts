"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Hook to detect mobile keyboard visibility and handle UI adjustments
 * Detects keyboard visibility by monitoring viewport height changes
 * 
 * @returns {boolean} - Whether the keyboard is currently visible
 */
export function useKeyboardVisibility() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [initialViewportHeight, setInitialViewportHeight] = useState(0);
  const isMobileRef = useRef(false);

  // Check if device is mobile/tablet
  const checkIsMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Check for touch capability and mobile-like screen size
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileScreen = window.innerWidth <= 768;
    
    return isTouchDevice && isMobileScreen;
  }, []);

  // Calculate keyboard visibility based on viewport height changes
  const calculateKeyboardVisibility = useCallback(() => {
    if (typeof window === 'undefined' || !isMobileRef.current) return;
    
    const currentViewportHeight = window.visualViewport?.height || window.innerHeight;
    const heightDifference = initialViewportHeight - currentViewportHeight;
    
    // Keyboard is considered visible if viewport height decreased by more than 150px
    // This threshold accounts for various keyboard sizes and orientations
    const keyboardThreshold = 150;
    const isVisible = heightDifference > keyboardThreshold;
    
    setIsKeyboardVisible(isVisible);
  }, [initialViewportHeight]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Check if device is mobile
    isMobileRef.current = checkIsMobile();
    
    // If not mobile, keyboard visibility is not relevant
    if (!isMobileRef.current) return;

    // Set initial viewport height
    const setInitialHeight = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      setInitialViewportHeight(height);
    };

    // Set initial height on mount
    setInitialHeight();

    // Set up event listeners
    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      // Debounce resize events for better performance
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateKeyboardVisibility();
      }, 100);
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // Only consider keyboard visible when focusing on input/textarea elements
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Small delay to allow viewport to adjust
        setTimeout(calculateKeyboardVisibility, 300);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      // When blurring from input/textarea, check if keyboard is still visible
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Small delay to allow viewport to adjust
        setTimeout(calculateKeyboardVisibility, 300);
      }
    };

    // Set up event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    
    // Visual viewport events (more accurate for mobile keyboard detection)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    // Recalculate on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        setInitialHeight();
        calculateKeyboardVisibility();
      }, 500); // Longer delay for orientation changes
    });

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, [calculateKeyboardVisibility, checkIsMobile]);

  return isKeyboardVisible;
}