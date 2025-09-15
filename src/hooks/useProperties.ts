"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToastContext } from "@/components/ToastProvider";
import { handleSupabaseError } from "@/lib/errors";
import { withSupabaseRetry } from "@/lib/retry";
import { Property } from "@/types"; // Use centralized type definition

interface UsePropertiesState {
  properties: Property[];
  loading: boolean;
  error: string | null;
  retryCount: number;
}
export function useProperties() {
  const { user } = useAuth();
  const { error: showError, success: showSuccess } = useToastContext();
  const [state, setState] = useState<UsePropertiesState>({
    properties: [],
    loading: false,
    error: null,
    retryCount: 0
  });

  const fetchProperties = async (isRetry = false) => {
    if (!user) return;

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      retryCount: isRetry ? prev.retryCount + 1 : 0
    }));

    try {
      const data = await withSupabaseRetry(
        async () => {
          const { data, error } = await supabase
            .from("properties")
            .select("*")
            .eq("owner_id", user.id)
            .order("inserted_at", { ascending: false });

          if (error) throw error;
          return data || [];
        },
        'Fetch properties'
      );

      setState(prev => ({ 
        ...prev, 
        properties: data, 
        loading: false, 
        error: null 
      }));
      
      if (isRetry) {
        showSuccess("Propiedades cargadas correctamente", "Conexión restablecida");
      }
    } catch (err) {
      const error = handleSupabaseError(err);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message 
      }));
      showError("Error al cargar propiedades", error.message);
    }
  };

  const createProperty = async (propertyData: Omit<Property, "id" | "owner_id" | "inserted_at">) => {
    if (!user) throw new Error("Usuario no autenticado");

    try {
      const data = await withSupabaseRetry(
        async () => {
          const { data, error } = await supabase
            .from("properties")
            .insert([{ ...propertyData, owner_id: user.id }])
            .select()
            .single();

          if (error) throw error;
          return data;
        },
        'Create property'
      );
      
      setState(prev => ({ 
        ...prev, 
        properties: [data, ...prev.properties] 
      }));
      showSuccess("Propiedad creada", "La propiedad se ha publicado correctamente");
      return data;
    } catch (err) {
      const error = handleSupabaseError(err);
      showError("Error al crear propiedad", error.message);
      throw error;
    }
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    // Optimistic update
    const originalProperties = state.properties;
    setState(prev => ({
      ...prev,
      properties: prev.properties.map(p => p.id === id ? { ...p, ...updates } : p)
    }));

    try {
      const data = await withSupabaseRetry(
        async () => {
          const { data, error } = await supabase
            .from("properties")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

          if (error) throw error;
          return data;
        },
        'Update property'
      );
      
      setState(prev => ({
        ...prev,
        properties: prev.properties.map(p => p.id === id ? data : p)
      }));
      showSuccess("Propiedad actualizada", "Los cambios se han guardado correctamente");
      return data;
    } catch (err) {
      // Rollback on failure
      setState(prev => ({ ...prev, properties: originalProperties }));
      const error = handleSupabaseError(err);
      showError("Error al actualizar propiedad", error.message);
      throw error;
    }
  };

  const deleteProperty = async (id: string) => {
    // Optimistic removal
    const originalProperties = state.properties;
    const propertyToDelete = state.properties.find(p => p.id === id);
    setState(prev => ({
      ...prev,
      properties: prev.properties.filter(p => p.id !== id)
    }));

    try {
      await withSupabaseRetry(
        async () => {
          const { error } = await supabase
            .from("properties")
            .delete()
            .eq("id", id);

          if (error) throw error;
        },
        'Delete property'
      );
      
      showSuccess("Propiedad eliminada", "La propiedad se ha eliminado correctamente");
    } catch (err) {
      // Rollback on failure
      setState(prev => ({ ...prev, properties: originalProperties }));
      const error = handleSupabaseError(err);
      showError("Error al eliminar propiedad", error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [user]);

  return {
    ...state,
    createProperty,
    updateProperty,
    deleteProperty,
    refetch: () => fetchProperties(false),
    retry: () => fetchProperties(true),
  };
}

