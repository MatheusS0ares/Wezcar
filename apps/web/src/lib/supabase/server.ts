import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@wezcar/types";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * `cookies()` is async as of Next.js 15+/16.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component with no way to set cookies.
            // Safe to ignore because proxy.ts refreshes the session on every request.
          }
        },
      },
    },
  );
}
