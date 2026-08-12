import { createClient, type User as SupabaseUser } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient> | null = null;

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase configuration missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  return { url, serviceRoleKey };
}

export function getSupabaseAdmin() {
  if (!adminClient) {
    const { url, serviceRoleKey } = getConfig();
    adminClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export async function getSupabaseUserFromAccessToken(token: string): Promise<SupabaseUser | null> {
  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error) return null;
    return data.user;
  } catch (error) {
    console.warn("[Auth] Supabase token verification failed:", error);
    return null;
  }
}
