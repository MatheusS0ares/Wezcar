import { redirect } from "next/navigation";
import { Car, Home, ShieldCheck, Warehouse, Wrench } from "lucide-react";
import { AppShell, type NavItem } from "@/components/app-shell";
import { getNavContext } from "@/lib/nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  const navItems: NavItem[] = [
    { href: "/painel", label: "Painel", icon: Home },
    { href: "/veiculos", label: "Veículos", icon: Car },
    { href: "/chamados", label: "Chamados", icon: Wrench },
  ];

  if (ctx.isWorkshopStaff) {
    navItems.push({ href: "/oficina", label: "Oficina", icon: Warehouse });
  }

  if (ctx.isPlatformAdmin) {
    navItems.push({ href: "/admin", label: "Admin", icon: ShieldCheck });
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
