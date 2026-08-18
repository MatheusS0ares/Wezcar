import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type NavContext = {
  user: { id: string; email: string };
  profile: {
    name: string;
    email: string;
    phone: string | null;
    status: string;
    tenant_id: string | null;
    created_at: string;
  } | null;
  isWorkshopStaff: boolean;
  isPlatformAdmin: boolean;
};

/**
 * Fetches everything an authenticated page/layout needs: the user, their profile and the
 * two coarse permission flags used to decide navigation/access. Wrapped in React's
 * `cache()` so calling it from the (app) layout AND from a page in the same request only
 * hits Supabase once, not twice — halves the round trips per page load.
 * Returns null when there is no session (caller should redirect to /entrar).
 */
export const getNavContext = cache(async (): Promise<NavContext | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: isWorkshopStaff }, { data: isPlatformAdmin }] =
    await Promise.all([
      supabase
        .from("users")
        .select("name, email, phone, status, tenant_id, created_at")
        .eq("id", user.id)
        .single(),
      supabase.rpc("has_permission", { permission_code: "work_order.update" }),
      supabase.rpc("has_permission", { permission_code: "platform.super_admin" }),
    ]);

  return {
    user: { id: user.id, email: user.email ?? "" },
    profile: profile ?? null,
    isWorkshopStaff: Boolean(isWorkshopStaff),
    isPlatformAdmin: Boolean(isPlatformAdmin),
  };
});
