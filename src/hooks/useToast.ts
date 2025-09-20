"use client";

import { useState, useCallback } from "react";
import { Toast, ToastType } from "@/components/ui/toast";

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((
    type: ToastType,
    title: string,
    description?: string,
    duration?: number
  ) => {
    const id = (++toastId).toString();
    const toast: Toast = { id, type, title, description, duration };
    
    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((title: string, description?: string) => 
    addToast("success", title, description), [addToast]);
  
  const error = useCallback((title: string, description?: string) => 
    addToast("error", title, description), [addToast]);
  
  const warning = useCallback((title: string, description?: string) => 
    addToast("warning", title, description), [addToast]);
  
  const info = useCallback((title: string, description?: string) => 
    addToast("info", title, description), [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

