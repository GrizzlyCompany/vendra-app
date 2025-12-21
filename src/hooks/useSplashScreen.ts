"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { isNative } from "@/lib/capacitor/platform";

const SPLASH_TIMEOUT_MS = 30 * 1000; // 30 seconds for testing (change to 10 * 60 * 1000 for production)
const STORAGE_KEY_LAST_ACTIVE = "vendra-app-last-active";
const STORAGE_KEY_SPLASH_SEEN = "vendra-splash-seen";
const SESSION_KEY_APP_RUNNING = "vendra-app-running"; // sessionStorage - cleared when app closes
const ACTIVITY_UPDATE_INTERVAL = 5000; // Update activity every 5 seconds

// Global state to share splash visibility with other components (like bottom nav)
let globalShowSplash = true;
const splashListeners: Set<(show: boolean) => void> = new Set();

export function subscribeToSplashState(callback: (show: boolean) => void) {
  splashListeners.add(callback);
  callback(globalShowSplash); // Call immediately with current state
  return () => splashListeners.delete(callback);
}

function setGlobalSplashState(show: boolean) {
  globalShowSplash = show;
  splashListeners.forEach(cb => cb(show));
}

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const activityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if this is a cold start (app was completely closed and reopened)
  const isColdStart = useCallback(() => {
    // sessionStorage is cleared when the app/browser is completely closed
    const appWasRunning = sessionStorage.getItem(SESSION_KEY_APP_RUNNING);
    return !appWasRunning;
  }, []);

  // Check if splash should be shown based on last activity time
  const shouldShowSplashOnResume = useCallback(() => {
    const lastActive = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
    if (lastActive) {
      const elapsed = Date.now() - parseInt(lastActive);
      console.log(`Splash: Time since last active: ${elapsed / 1000}s, threshold: ${SPLASH_TIMEOUT_MS / 1000}s`);
      return elapsed > SPLASH_TIMEOUT_MS;
    }
    return true;
  }, []);

  // Update last activity time
  const updateLastActive = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, Date.now().toString());
  }, []);

  // Set splash state both locally and globally
  const setSplashState = useCallback((show: boolean) => {
    setShowSplash(show);
    setGlobalSplashState(show);
  }, []);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const mobile = window.innerWidth <= 767;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Check if this is a cold start (app was closed and reopened)
    const coldStart = isColdStart();
    const hasSeenSplash = localStorage.getItem(STORAGE_KEY_SPLASH_SEEN);

    if (coldStart) {
      // App was closed and reopened - ALWAYS show splash
      console.log('Splash: Cold start detected - showing splash');
      setSplashState(true);
    } else if (!hasSeenSplash) {
      // First time user ever
      console.log('Splash: First time user, showing splash');
      setSplashState(true);
    } else if (shouldShowSplashOnResume()) {
      // Been away for too long
      console.log('Splash: Been away too long, showing splash');
      setSplashState(true);
    } else {
      // Recently active and app didn't close completely
      console.log('Splash: Recently active, skipping splash');
      setSplashState(false);
    }

    // Mark that the app is now running (for detecting cold starts)
    sessionStorage.setItem(SESSION_KEY_APP_RUNNING, 'true');

    // Start updating activity time periodically
    activityIntervalRef.current = setInterval(() => {
      updateLastActive();
    }, ACTIVITY_UPDATE_INTERVAL);

    // Also update on user interactions
    const handleActivity = () => {
      updateLastActive();
    };

    window.addEventListener('click', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);

    // Update immediately
    updateLastActive();

    // Setup Capacitor App state listener for background detection
    let appStateListener: { remove: () => void } | null = null;

    const setupAppStateListener = async () => {
      if (!isNative()) return;

      try {
        const { App } = await import('@capacitor/app');

        appStateListener = await App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            // App going to background - mark the time
            console.log('Splash: App going to background');
            updateLastActive();
          } else {
            // App coming to foreground - check if we need to show splash
            console.log('Splash: App coming to foreground');
            if (shouldShowSplashOnResume()) {
              console.log('Splash: Timeout exceeded, showing splash');
              setSplashState(true);
            }
          }
        });

        console.log('Splash: Capacitor state listener initialized');
      } catch (error) {
        console.warn('Splash: Failed to setup state listener:', error);
      }
    };

    setupAppStateListener();

    // Handle page visibility change (for browser/PWA)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - save time
        updateLastActive();
        console.log('Splash: Page hidden, saving time');
      } else {
        // Page is visible - check if should show splash
        console.log('Splash: Page visible, checking time...');
        if (shouldShowSplashOnResume()) {
          console.log('Splash: Timeout exceeded, showing splash');
          setSplashState(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (activityIntervalRef.current) {
        clearInterval(activityIntervalRef.current);
      }
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [isColdStart, shouldShowSplashOnResume, updateLastActive, setSplashState]);

  const hideSplash = () => {
    setSplashState(false);
    // Mark splash as seen
    localStorage.setItem(STORAGE_KEY_SPLASH_SEEN, Date.now().toString());
    // Update last active time
    updateLastActive();
  };

  return {
    showSplash,
    isMobile,
    hideSplash
  };
}