"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading";

interface SplashScreenProps {
  onComplete: () => void;
  show?: boolean; // Add optional show prop
}

export function SplashScreen({ onComplete, show = true }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Mostrar splash screen exactamente 5 segundos
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Pequeño delay para la animación de salida
      setTimeout(onComplete, 500);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // If show is false, don't render the splash screen
  if (!show) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 splash-screen"
          suppressHydrationWarning
        >
          <div className="splash-content">
            {/* Logo/Texto principal */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="space-y-2"
              suppressHydrationWarning
            >
              <h1 className="splash-logo font-serif font-bold tracking-tight text-primary">
                VENDRA
              </h1>
              <p className="splash-subtitle text-muted-foreground font-sans">
                Conecta compradores y vendedores
              </p>
            </motion.div>

            {/* Loading Spinner */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8, ease: "easeOut" }}
            >
              <LoadingSpinner size="lg" className="text-primary my-6" />
            </motion.div>

            {/* Texto de carga */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="splash-loading text-muted-foreground font-sans"
            >
              Cargando...
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}