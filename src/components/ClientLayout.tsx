"use client";

import { ReactNode } from "react";
import { PageTransition } from "@/components/PageTransition";
import { MorphTransitionProvider } from "@/components/transitions/PropertyMorphTransition";

import { useCapacitorInit } from "@/hooks/useCapacitorInit";

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  // Initialize native features if running on Capacitor
  useCapacitorInit();

  return (
    <MorphTransitionProvider>
      <PageTransition>
        {children}
      </PageTransition>
    </MorphTransitionProvider>
  );
}