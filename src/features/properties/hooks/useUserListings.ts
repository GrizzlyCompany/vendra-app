import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Property } from "@/types";

// Simplified types for profile display
export type ProfileProject = {
  id: string;
  project_name: string;
  city_province: string | null;
  address: string | null;
  images: string[] | null;
  unit_price_range: string | null;
  project_status: string | null;
};

interface UseUserListingsReturn {
  properties: Property[];
  projects: ProfileProject[];
  listingsError: string | null;
  isListingsLoading: boolean;
}

export function useUserListings(userId: string | null, userRole: string | null): UseUserListingsReturn {
  const [listingsError, setListingsError] = useState<string | null>(null);
  const [isListingsLoading, setIsListingsLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [projects, setProjects] = useState<ProfileProject[]>([]);

  useEffect(() => {
    if (!userId) {
      setIsListingsLoading(false);
      return;
    }

    let active = true;
    setIsListingsLoading(true);
    setListingsError(null);

    const loadListings = async () => {
      try {
        let listingsData: any[] = [];
        let error: any = null;

        if (userRole === 'empresa_constructora') {
          // Fetch projects for construction companies
          const { data: projs, error: projsErr } = await supabase
            .from("projects")
            .select("id,project_name,city_province,address,images,unit_price_range,project_status")
            .eq("owner_id", userId)
            .order("created_at", { ascending: false });
          listingsData = projs ?? [];
          error = projsErr;
        } else {
          // Fetch properties for other users
          const { data: props, error: propsErr } = await supabase
            .from("properties")
            .select("id,title,description,price,location,images,owner_id,type,inserted_at,role_priority")
            .eq("owner_id", userId)
            .order("inserted_at", { ascending: false });
          listingsData = props ?? [];
          error = propsErr;
        }

        if (error) {
          throw new Error(error.message ?? "Error loading listings");
        }

        if (!active) return;

        if (userRole === 'empresa_constructora') {
          // Process projects
          const normalizedProjects: ProfileProject[] = (listingsData ?? []).map((proj: any) => ({
            id: String(proj.id),
            project_name: String(proj.project_name),
            city_province: proj.city_province ?? null,
            address: proj.address ?? null,
            images: Array.isArray(proj.images) ? proj.images : (proj.images ? [String(proj.images)] : null),
            unit_price_range: proj.unit_price_range ?? null,
            project_status: proj.project_status ?? null,
          }));
          setProjects(normalizedProjects);
          setProperties([]); // Clear properties for construction companies
        } else {
          // Process properties
          const normalizedProperties: Property[] = (listingsData ?? []).map((prop: any) => ({
            id: String(prop.id),
            title: String(prop.title),
            description: prop.description ?? null,
            price: Number(prop.price) || 0,
            location: String(prop.location ?? ""),
            images: Array.isArray(prop.images) ? prop.images : (prop.images ? [String(prop.images)] : null),
            owner_id: String(prop.owner_id),
            type: prop.type ?? null,
            inserted_at: (prop.inserted_at as string) ?? new Date().toISOString(),
            role_priority: prop.role_priority ?? 0,
          }));
          setProperties(normalizedProperties);
          setProjects([]); // Clear projects for regular users
        }
      } catch (error: any) {
        if (!active) return;
        setListingsError(error?.message ?? "Unknown error");
      } finally {
        if (active) setIsListingsLoading(false);
      }
    };

    loadListings();
    return () => {
      active = false;
    };
  }, [userId, userRole]);

  return {
    properties,
    projects,
    listingsError,
    isListingsLoading,
  };
}
