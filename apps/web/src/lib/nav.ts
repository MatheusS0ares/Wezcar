import { createClient } from "@/lib/supabase/server";

export type NavContext = {
  user: { id: string; name: string; email: string };
  isWorkshopStaff: boolean;
  isPlatformAdmin: boolean;
};

/**
 * Fetches everything the authenticated app shell needs to decide which nav items to
 * show. Returns null when there is no session (caller should redirect to /entrar).
 */
export async function getNavContext(): Promise<NavContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: isWorkshopStaff }, { data: isPlatformAdmin }] =
    await Promise.all([
      supabase.from("users").select("name, email").eq("id", user.id).single(),
      supabase.rpc("has_permission", { permission_code: "work_order.update" }),
      supabase.rpc("has_permission", { permission_code: "platform.super_admin" }),
    ]);

  return {
    user: {
      id: user.id,
      name: profile?.name ?? user.email ?? "Usuário",
      email: profile?.email ?? user.email ?? "",
    },
    isWorkshopStaff: Boolean(isWorkshopStaff),
    isPlatformAdmin: Boolean(isPlatformAdmin),
  };
}
