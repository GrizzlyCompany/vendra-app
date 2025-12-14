"use client";

import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { ReactNode, useRef, useId } from "react";
import { useMorphTransition } from "./PropertyMorphTransition";

interface MorphCardProps {
  children: ReactNode;
  targetUrl: string;
  className?: string;
  enableMorph?: boolean;
}

const modernEasing = [0.25, 0.1, 0.25, 1] as const; // Instagram-like easing
const snapEasing = [0.68, -0.55, 0.265, 1.55] as const; // Subtle bounce

export function MorphCard({ 
  children, 
  targetUrl, 
  className = "",
  enableMorph = true 
}: MorphCardProps) {
  const { startTransition, isTransitioning, transitionElementId } = useMorphTransition();
  const cardRef = useRef<HTMLDivElement>(null);
  const elementId = useId();
  
  const scale = useMotionValue(1);
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);
  
  const isCurrentlyTransitioning = isTransitioning && transitionElementId === elementId;
  
  const handleClick = () => {
    if (!enableMorph || isTransitioning) {
      return;
    }
    startTransition(elementId, targetUrl);
  };

  const cardVariants = {
    idle: {
      scale: 1,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      opacity: 1,
      filter: "blur(0px) brightness(1)",
    },
    hover: {
      scale: 1.02,
      y: -8,
      rotateX: 2,
      rotateY: 1,
      opacity: 1,
      filter: "blur(0px) brightness(1.05)",
      transition: {
        duration: 0.4,
        ease: modernEasing,
      } as any
    },
    morphing: {
      scale: 1.05,
      y: -12,
      rotateX: 0,
      rotateY: 0,
      opacity: 0.95,
      filter: "blur(1px) brightness(1.1)",
      transition: {
        duration: 0.6,
        ease: snapEasing,
      } as any
    },
    exit: {
      scale: 0.95,
      y: 20,
      opacity: 0,
      filter: "blur(4px) brightness(0.9)",
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 1, 1] as const,
      } as any
    }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        duration: 0.2,
        ease: "easeOut" as const
      } as any
    }
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative cursor-pointer ${className}`}
      variants={cardVariants}
      initial="idle"
      animate={
        isCurrentlyTransitioning 
          ? "morphing" 
          : "idle"
      }
      whileHover={!isTransitioning ? "hover" : undefined}
      onClick={handleClick}
      style={{ 
        transformOrigin: "center center",
        willChange: "transform, opacity, filter"
      }}
    >
      {/* Gradient overlay that appears on hover/transition */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-primary/5 rounded-2xl pointer-events-none z-10"
        variants={overlayVariants}
        initial="hidden"
        animate={isCurrentlyTransitioning ? "visible" : "hidden"}
      />
      
      {/* Subtle glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 70%)",
          opacity: 0
        }}
        animate={{
          opacity: isCurrentlyTransitioning ? 0.6 : 0,
          scale: isCurrentlyTransitioning ? 1.1 : 1,
        }}
        transition={{ duration: 0.4, ease: modernEasing as any }}
      />
      
      {children}
      
      {/* Loading indicator for transition */}
      <AnimatePresence>
        {isCurrentlyTransitioning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center bg-background/10 backdrop-blur-sm rounded-2xl z-20"
          >
            <div className="flex items-center gap-2 text-primary">
              <motion.div
                className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-sm font-medium">Cargando...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}