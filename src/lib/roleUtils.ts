import { supabase } from "@/lib/supabase/client";

/**
 * Synchronizes user role between auth metadata and database
 * @param userId - The user ID
 * @returns The effective role of the user
 */
export async function syncUserRole(userId: string): Promise<string | null> {
  try {
    // Validate userId
    if (!userId) {
      console.error("Invalid userId provided to syncUserRole");
      return null;
    }
    
    // Get role from auth metadata
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Error fetching auth user:", authError);
      return null;
    }
    
    const metaRole = (authUser.user?.user_metadata as any)?.role as string | undefined;
    
    // Log for debugging
    console.debug("syncUserRole: userId=", userId, "metaRole=", metaRole);
    
    // Get role from database
    const { data: dbUser, error: dbError } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
    if (dbError) {
      console.error("Error fetching user from database:", dbError);
      return null;
    }
    
    const dbRole = dbUser?.role as string | undefined;
    
    // Log for debugging
    console.debug("syncUserRole: dbRole=", dbRole);
    
    // If metadata role exists and differs from database role, sync to database
    if (metaRole && (!dbRole || dbRole !== metaRole)) {
      console.debug("syncUserRole: syncing role to database", { userId, metaRole, dbRole });
      
      // Special handling for empresa_constructora role due to database constraint
      if (metaRole === 'empresa_constructora' && dbRole && dbRole !== 'empresa_constructora') {
        console.warn("Cannot change role to empresa_constructora after registration due to database constraint");
        // In this case, we'll return the database role instead of trying to update it
        return dbRole;
      }
      
      const { data, error } = await supabase.from("users").upsert({ id: userId, role: metaRole }, { onConflict: "id" });
      if (error) {
        console.error("Error syncing user role:", error);
        console.error("Upsert data:", { userId, metaRole });
        console.error("Full error object:", JSON.stringify(error, null, 2));
      } else {
        console.debug("syncUserRole: successfully synced role to database");
      }
    }
    
    // Return the effective role (database role takes precedence if it exists)
    // But if we have a special case where we can't update to empresa_constructora, return the dbRole
    const effectiveRole = dbRole ?? metaRole ?? null;
    console.debug("syncUserRole: returning effectiveRole=", effectiveRole);
    return effectiveRole;
  } catch (error) {
    console.error("Error in syncUserRole:", error);
    return null;
  }
}

/**
 * Gets the effective user role without syncing
 * @param userId - The user ID
 * @returns The effective role of the user
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    // Validate userId
    if (!userId) {
      console.error("Invalid userId provided to getUserRole");
      return null;
    }
    
    // Get role from auth metadata
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Error fetching auth user:", authError);
      return null;
    }
    
    const metaRole = (authUser.user?.user_metadata as any)?.role as string | undefined;
    
    // Log for debugging
    console.debug("getUserRole: userId=", userId, "metaRole=", metaRole);
    
    // If we have role in metadata, return it
    if (metaRole) {
      console.debug("getUserRole: returning metaRole=", metaRole);
      return metaRole;
    }
    
    // Otherwise, get role from database
    const { data: dbUser, error: dbError } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();
    if (dbError) {
      console.error("Error fetching user from database:", dbError);
      return null;
    }
    
    const dbRole = dbUser?.role as string | null;
    console.debug("getUserRole: returning dbRole=", dbRole);
    return dbRole;
  } catch (error) {
    console.error("Error in getUserRole:", error);
    return null;
  }
}