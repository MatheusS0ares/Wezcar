import { redirect } from "next/navigation";
import { AppShell, type NavItem } from "@/components/app-shell";
import { getNavContext } from "@/lib/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

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
    >
      {children}
    </AppShell>
  );
}
