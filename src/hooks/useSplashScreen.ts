"use client";

import { useState, useEffect } from "react";

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(true); // Always show splash screen initially
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detectar si es dispositivo móvil
    const checkMobile = () => {
      const mobile = window.innerWidth <= 767;
      setIsMobile(mobile);
    };

    checkMobile();

    // Escuchar cambios de tamaño de ventana
    const handleResize = () => checkMobile();
    window.addEventListener("resize", handleResize);

    // Check if splash screen has been shown recently
    const hasSeenSplash = localStorage.getItem("vendra-splash-seen");
    
    // Show splash screen if it hasn't been shown or if it was shown more than 24 hours ago
    if (!hasSeenSplash) {
      setShowSplash(true);
    } else {
      const lastSeen = parseInt(hasSeenSplash);
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

      if (lastSeen < oneDayAgo) {
        setShowSplash(true);
      } else {
        // If splash was shown recently, don't show it again
        setShowSplash(false);
      }
    }

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hideSplash = () => {
    setShowSplash(false);
    // Marcar que se vio el splash screen
    localStorage.setItem("vendra-splash-seen", Date.now().toString());
  };

  return {
    showSplash,
    isMobile,
    hideSplash
  };
}