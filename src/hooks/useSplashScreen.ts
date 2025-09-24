"use client";

import { useState, useEffect } from "react";

export function useSplashScreen() {
  const [showSplash, setShowSplash] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detectar si es dispositivo móvil
    const checkMobile = () => {
      const mobile = window.innerWidth <= 767;
      setIsMobile(mobile);

      // Solo mostrar splash screen en móviles
      if (mobile) {
        const hasSeenSplash = localStorage.getItem("vendra-splash-seen");

        // Mostrar splash screen si no se ha visto antes o si fue hace más de 24 horas
        if (!hasSeenSplash) {
          setShowSplash(true);
        } else {
          const lastSeen = parseInt(hasSeenSplash);
          const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

          if (lastSeen < oneDayAgo) {
            setShowSplash(true);
          }
        }
      }
    };

    checkMobile();

    // Escuchar cambios de tamaño de ventana
    const handleResize = () => checkMobile();
    window.addEventListener("resize", handleResize);

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
