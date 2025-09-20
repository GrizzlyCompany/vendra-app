import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline";
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";
    const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
      default:
        "border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]",
      secondary:
        "border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]",
      outline:
        "border-[hsl(var(--border))] text-[hsl(var(--foreground))]",
    };
    return (
      <span ref={ref} className={cn(base, variants[variant], className)} {...props} />
    );
  }
);
Badge.displayName = "Badge";
