"use client";

import { useEffect, useCallback } from 'react';

/**
 * Hook for enhanced keyboard navigation support
 * Provides utilities for focus management, keyboard shortcuts, and accessibility
 */
export function useKeyboardNavigation() {
  /**
   * Moves focus to the next focusable element
   */
  const focusNext = useCallback(() => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1]?.focus();
    }
  }, []);

  /**
   * Moves focus to the previous focusable element
   */
  const focusPrevious = useCallback(() => {
    const focusableElements = getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

    if (currentIndex > 0) {
      focusableElements[currentIndex - 1]?.focus();
    }
  }, []);

  /**
   * Moves focus to the first focusable element
   */
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    focusableElements[0]?.focus();
  }, []);

  /**
   * Moves focus to the last focusable element
   */
  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    focusableElements[focusableElements.length - 1]?.focus();
  }, []);

  /**
   * Traps focus within a container element
   * @param containerRef - Reference to the container element
   * @param options - Configuration options
   */
  const trapFocus = useCallback((
    containerRef: React.RefObject<HTMLElement>,
    options: {
      initialFocus?: boolean;
      restoreFocus?: boolean;
      onEscape?: () => void;
    } = {}
  ) => {
    const { initialFocus = true, restoreFocus = true, onEscape } = options;

    let previouslyFocusedElement: HTMLElement | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (event.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;

        const focusableElements = getFocusableElements(container);
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const target = event.target as HTMLElement;
      if (!container.contains(target)) {
        // Focus moved outside container, bring it back
        const focusableElements = getFocusableElements(container);
        focusableElements[0]?.focus();
      }
    };

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // Store previously focused element
      if (restoreFocus) {
        previouslyFocusedElement = document.activeElement as HTMLElement;
      }

      // Set initial focus
      if (initialFocus) {
        const focusableElements = getFocusableElements(container);
        focusableElements[0]?.focus();
      }

      // Add event listeners
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('focusin', handleFocusIn);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('focusin', handleFocusIn);

        // Restore focus if requested
        if (restoreFocus && previouslyFocusedElement) {
          previouslyFocusedElement.focus();
        }
      };
    }, [containerRef, initialFocus, restoreFocus, onEscape]);
  }, []);

  /**
   * Announces content to screen readers
   * @param message - Message to announce
   * @param priority - Announcement priority ('polite' or 'assertive')
   */
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    document.body.appendChild(announcement);
    announcement.textContent = message;

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  /**
   * Handles common keyboard shortcuts
   * @param shortcuts - Object mapping key combinations to handlers
   */
  const useKeyboardShortcuts = useCallback((
    shortcuts: Record<string, (event: KeyboardEvent) => void>
  ) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
      const keys = [];

      if (event.ctrlKey || event.metaKey) keys.push('ctrl');
      if (event.shiftKey) keys.push('shift');
      if (event.altKey) keys.push('alt');
      keys.push(event.key.toLowerCase());

      const keyCombination = keys.join('+');
      const handler = shortcuts[keyCombination];

      if (handler) {
        event.preventDefault();
        handler(event);
      }
    }, [shortcuts]);

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
  }, []);

  return {
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    trapFocus,
    announceToScreenReader,
    useKeyboardShortcuts
  };
}

/**
 * Gets all focusable elements within a container (or document)
 * @param container - Container element (defaults to document)
 * @returns Array of focusable elements
 */
function getFocusableElements(container: HTMLElement | Document = document): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];

  const elements = container.querySelectorAll(focusableSelectors.join(', '));
  return Array.from(elements) as HTMLElement[];
}

/**
 * Hook for managing skip links (accessibility feature)
 */
export function useSkipLinks() {
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main, [role="main"]');
    if (mainContent) {
      (mainContent as HTMLElement).focus();
      (mainContent as HTMLElement).scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('nav, [role="navigation"]');
    if (navigation) {
      (navigation as HTMLElement).focus();
      (navigation as HTMLElement).scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  return {
    skipToContent,
    skipToNavigation
  };
}

/**
 * Hook for managing ARIA live regions
 */
export function useAriaLive() {
  const announce = useCallback((
    message: string,
    priority: 'polite' | 'assertive' = 'polite',
    timeout = 5000
  ) => {
    // Create or reuse live region
    let liveRegion = document.getElementById('aria-live-region');

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'aria-live-region';
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;

    // Clear after timeout
    if (timeout > 0) {
      setTimeout(() => {
        if (liveRegion && liveRegion.parentNode) {
          liveRegion.textContent = '';
        }
      }, timeout);
    }
  }, []);

  return { announce };
}