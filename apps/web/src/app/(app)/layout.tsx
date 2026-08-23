import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/app-shell";
import { getNavContext } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const navItems: NavItem[] = [
    { href: "/painel", label: "Painel", icon: "home" },
    { href: "/veiculos", label: "Veículos", icon: "car" },
    { href: "/chamados", label: "Chamados", icon: "wrench" },
  ];

  if (ctx.isWorkshopStaff) {
    navItems.push({ href: "/oficina", label: "Oficina", icon: "warehouse" });
  }

  if (ctx.isPlatformAdmin) {
    navItems.push({ href: "/admin", label: "Admin", icon: "shield" });
  }

  return (
    <AppShell
      user={{ name: ctx.profile?.name ?? ctx.user.email, email: ctx.user.email }}
      navItems={navItems}
      notifications={notifications ?? []}
    >
      {children}
    </AppShell>
  );
}
