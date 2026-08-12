import { createClient } from "@supabase/supabase-js";

// These are public project identifiers. Railway injects environment variables
// after the Vite build, so compiled fallbacks keep the external browser client
// functional while local environments can still override them.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://jjzjgdqmvqegbbriidke.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_-5jl_krpq5m8rL0SWqqWgw_tmboKjgQ";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

let accessToken: string | null = null;

void supabase.auth.getSession().then(({ data }) => {
  accessToken = data.session?.access_token ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  accessToken = session?.access_token ?? null;
});

export function getSupabaseAccessToken() {
  return accessToken;
}
