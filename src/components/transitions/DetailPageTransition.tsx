"use client";

import { motion, useInView } from "framer-motion";
import { ReactNode, useRef } from "react";
import { useMorphTransition } from "./PropertyMorphTransition";

interface DetailPageTransitionProps {
  children: ReactNode;
  className?: string;
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

const slideUpFade = {
  hidden: { 
    opacity: 0, 
    y: 40,
    filter: "blur(4px)"
  },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as const,
    } as any
  }
};

const scaleBlur = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    filter: "blur(8px)"
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1] as const,
    } as any
  }
};

export function DetailPageTransition({ children, className = "" }: DetailPageTransitionProps) {
  const { isTransitioning } = useMorphTransition();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export function DetailSection({ children, className = "", delay = 0 }: { 
  children: ReactNode; 
  className?: string; 
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={slideUpFade}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function DetailHero({ children, className = "" }: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <motion.div
      className={className}
      variants={scaleBlur}
    >
      {children}
    </motion.div>
  );
}

export function DetailBackButton({ children, className = "" }: { 
  children: ReactNode; 
  className?: string; 
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: 0.6,
        ease: [0.68, -0.55, 0.265, 1.55] as const // Bouncy entrance
      }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {children}
    </motion.div>
  );
}