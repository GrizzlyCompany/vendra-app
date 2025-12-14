import { supabase } from "@/lib/supabase/client";

/**
 * Safe database utilities for handling potentially missing columns
 * and providing graceful fallbacks for database operations.
 */

/**
 * Type guard to check if a database result has an error
 */
export function hasDatabaseError(result: any): result is { error: any } {
  return result && typeof result === "object" && "error" in result && result.error != null;
}

/**
 * Safe profile data fetcher that handles missing columns
 */
export async function fetchUserProfile(userId: string) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const result = await supabase
    .from("users")
    .select(`
      name, email, role, avatar_url,
      rnc, website, headquarters_address,
      operational_areas, contact_person,
      primary_phone, secondary_phone,
      legal_documents, facebook_url,
      instagram_url, linkedin_url,
      terms_accepted
    `)
    .eq("id", userId)
    .single();

  if (result.error) {
    throw result.error;
  }

  const user = result.data;

  if (!user) {
    throw new Error("User not found");
  }

  // Safe transformation with fallbacks for potentially missing/null fields
  const transformedUser = {
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role ?? "comprador",
    avatar_url: user.avatar_url ?? null,
    phone: (user as any).primary_phone ?? "",
    rnc: (user as any).rnc ?? "",
    website: (user as any).website ?? "",
    headquarters_address: (user as any).headquarters_address ?? "",
    operational_areas: Array.isArray((user as any).operational_areas)
      ? (user as any).operational_areas
      : [],
    contact_person: (user as any).contact_person ?? "",
    primary_phone: (user as any).primary_phone ?? "",
    secondary_phone: (user as any).secondary_phone ?? "",
    legal_documents: Array.isArray((user as any).legal_documents)
      ? (user as any).legal_documents
      : [],
    facebook_url: (user as any).facebook_url ?? "",
    instagram_url: (user as any).instagram_url ?? "",
    linkedin_url: (user as any).linkedin_url ?? "",
    terms_accepted: (user as any).terms_accepted ?? false,
  };

  return transformedUser;
}

/**
 * Safe profile update that handles partial updates
 */
export async function updateUserProfile(userId: string, updates: Record<string, any>) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  // Ensure operational_areas is an array if provided
  if (updates.operational_areas && !Array.isArray(updates.operational_areas)) {
    updates.operational_areas = [updates.operational_areas];
  }

  // Ensure legal_documents is an array if provided
  if (updates.legal_documents && !Array.isArray(updates.legal_documents)) {
    updates.legal_documents = [updates.legal_documents];
  }

  const result = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId);

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

/**
 * Safe user role fetcher
 */
export async function fetchUserRole(userId: string): Promise<string | null> {
  if (!userId) return null;

  try {
    const result = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (result.error) {
      console.warn("Failed to fetch user role:", result.error);
      return null;
    }

    return result.data?.role ?? null;
  } catch (error) {
    console.warn("Failed to fetch user role:", error);
    return null;
  }
}

/**
 * Retry utility for database operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  throw new Error("Unexpected error in retry logic");
}

/**
 * Safe array parsing for database fields
 */
export function safeArrayParse(value: any, fallback: any[] = []): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.startsWith("{")) {
    // PostgreSQL array format, try to split on commas
    return value.slice(1, -1).split(",").map(s => s.trim().replace(/^"(.*)"$/, "$1"));
  }
  return fallback;
}

/**
 * Safe string parsing for database fields
 */
export function safeStringParse(value: any, fallback: string = ""): string {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

/**
 * Safe boolean parsing for database fields
 */
export function safeBooleanParse(value: any, fallback: boolean = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return fallback;
}
