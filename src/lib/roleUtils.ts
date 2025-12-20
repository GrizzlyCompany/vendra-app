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
      console.error("[syncUserRole] Error: Invalid userId provided");
      return null;
    }

    // Get role from auth metadata
    const { data: authUser, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("[syncUserRole] Error fetching auth user:", authError);
      return null;
    }

    const metaRole = (authUser.user?.user_metadata as any)?.role as string | undefined;

    // Get role from database
    const { data: dbUser, error: dbError } = await supabase.from("users").select("role").eq("id", userId).maybeSingle();

    if (dbError) {
      console.error("[syncUserRole] Database Error for user:", userId);
      console.error("Code:", dbError.code);
      console.error("Message:", dbError.message);
      console.error("Details:", dbError.details);
      return null;
    }

    const dbRole = dbUser?.role as string | undefined;

    // Sync metadata role to database if needed
    if (metaRole && (!dbRole || dbRole !== metaRole)) {
      if (metaRole === 'empresa_constructora' && dbRole && dbRole !== 'empresa_constructora') {
        console.warn("[syncUserRole] Cannot update to empresa_constructora due to DB constraint");
        return dbRole;
      }

      const { error: syncError } = await supabase.from("users").upsert({ id: userId, role: metaRole }, { onConflict: "id" });
      if (syncError) {
        console.error("[syncUserRole] Sync Error:", syncError);
      }
    }

    return dbRole ?? metaRole ?? null;
  } catch (error) {
    console.error("[syncUserRole] Unhandled exception:", error);
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
    if (!userId) return null;

    // 1. Try metadata first (fastest)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const metaRole = (authUser?.user_metadata as any)?.role as string | undefined;

    if (metaRole) return metaRole;

    // 2. Fallback to database
    const { data: dbUser, error: dbError } = await supabase.from("users")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (dbError) {
      console.error("[getUserRole] Database Error for user:", userId);
      console.error("Error Object:", JSON.stringify(dbError));
      console.error("Error Code:", dbError.code);
      console.error("Error Message:", dbError.message);
      return null;
    }

    return dbUser?.role as string | null;
  } catch (error) {
    console.error("[getUserRole] Unhandled exception:", error);
    return null;
  }
}