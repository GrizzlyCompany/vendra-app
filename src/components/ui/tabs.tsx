"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Minimal tab system compatible with the usage in profile/page.tsx
// API: <Tabs defaultValue> <TabsList> <TabsTrigger value> ... <TabsContent value>

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export type TabsProps = React.PropsWithChildren<{
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
}>;

export function Tabs({ defaultValue, value: controlled, onValueChange, className, children }: TabsProps) {
  const [uncontrolled, setUncontrolled] = React.useState<string>(defaultValue ?? "");
  const isControlled = controlled !== undefined;
  const value = isControlled ? controlled! : uncontrolled;
  const setValue = React.useCallback(
    (v: string) => {
      if (!isControlled) setUncontrolled(v);
      onValueChange?.(v);
    },
    [isControlled, onValueChange]
  );

  // If no default provided, set first TabsTrigger value after mount
  const firstTriggerValueRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!isControlled && !uncontrolled && firstTriggerValueRef.current) {
      setUncontrolled(firstTriggerValueRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;
export function TabsList({ className, ...props }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        // Keep styling neutral; let caller choose grid/flex. Provide base colors/padding.
        "rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string;
};
export function TabsTrigger({ className, value, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");
  const selected = ctx.value === value;
  // capture first trigger value
  React.useEffect(() => {
    if (!TabsTriggerFirstRef.current) TabsTriggerFirstRef.current = value;
  }, [value]);
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium",
        selected ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    />
  );
}

const TabsTriggerFirstRef: { current: string | null } = { current: null };

export type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};
export function TabsContent({ className, value, children, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className={cn("focus-visible:outline-none", className)} {...props}>
      {children}
    </div>
  );
}
