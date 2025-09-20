"use client";

import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ReactNode, createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

interface MorphTransitionContextType {
  startTransition: (elementId: string, targetUrl: string) => void;
  isTransitioning: boolean;
  transitionElementId: string | null;
}

const MorphTransitionContext = createContext<MorphTransitionContextType | null>(null);

export function useMorphTransition() {
  const context = useContext(MorphTransitionContext);
  if (!context) {
    throw new Error("useMorphTransition must be used within MorphTransitionProvider");
  }
  return context;
}

interface MorphTransitionProviderProps {
  children: ReactNode;
}

export function MorphTransitionProvider({ children }: MorphTransitionProviderProps) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionElementId, setTransitionElementId] = useState<string | null>(null);

  const startTransition = async (elementId: string, targetUrl: string) => {
    setTransitionElementId(elementId);
    setIsTransitioning(true);

    // Add a slight delay to allow the animation to start
    await new Promise(resolve => setTimeout(resolve, 100));
    
    router.push(targetUrl);
    
    // Reset after navigation
    setTimeout(() => {
      setIsTransitioning(false);
      setTransitionElementId(null);
    }, 800);
  };

  return (
    <MorphTransitionContext.Provider 
      value={{ startTransition, isTransitioning, transitionElementId }}
    >
      {children}
      
      {/* Frosted Glass Overlay */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md"
            style={{ backdropFilter: "blur(16px) saturate(1.5)" }}
          />
        )}
      </AnimatePresence>
    </MorphTransitionContext.Provider>
  );
}