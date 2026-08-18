import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@wezcar/types";

/**
 * Supabase client for Client Components. Reads the anon key, so it is safe to
 * call from the browser — every table it touches is protected by RLS.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
