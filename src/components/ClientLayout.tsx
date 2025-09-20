"use client";

import { ReactNode } from "react";
import { PageTransition } from "@/components/PageTransition";
import { MorphTransitionProvider } from "@/components/transitions/PropertyMorphTransition";

interface ClientLayoutProps {
  children: ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <MorphTransitionProvider>
      <PageTransition>
        {children}
      </PageTransition>
    </MorphTransitionProvider>
  );
}