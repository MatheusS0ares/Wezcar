"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Car, Home, LogOut, ShieldCheck, Warehouse, Wrench } from "lucide-react";
import { logout } from "@/app/entrar/actions";

// A Server Component can't pass a component *reference* (e.g. the Home icon itself) as a
// prop to a Client Component — only serializable data. So the layout passes an icon *key*,
// and this map (which only exists client-side) resolves it to the actual icon component.
const ICONS = { home: Home, car: Car, wrench: Wrench, warehouse: Warehouse, shield: ShieldCheck };

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

export function AppShell({
  user,
  navItems,
  children,
}: {
  user: { name: string; email: string };
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex md:w-60 md:flex-shrink-0 md:flex-col md:border-r md:border-[var(--wz-border)] md:bg-[var(--wz-surface)]">
        <div className="flex items-center gap-2 px-5 py-5">
          <Image src="/wezcar-icon.png" alt="" width={36} height={19} />
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--wz-cyan)]">
            Wezcar
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-[var(--wz-primary)]/10 text-[var(--wz-primary)]"
                    : "text-[var(--wz-text-secondary)] hover:bg-[var(--wz-background)] hover:text-[var(--wz-text-primary)]"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--wz-border)] p-4">
          <p className="truncate text-sm font-medium text-[var(--wz-text-primary)]">
            {user.name}
          </p>
          <p className="truncate text-xs text-[var(--wz-text-secondary)]">{user.email}</p>
          <form action={logout}>
            <button
              type="submit"
              className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--wz-text-secondary)] hover:bg-[var(--wz-background)]"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar — mobile only */}
        <header className="flex items-center justify-between border-b border-[var(--wz-border)] bg-[var(--wz-surface)] px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <Image src="/wezcar-icon.png" alt="" width={34} height={18} />
            <span className="text-sm font-semibold uppercase tracking-wide text-[var(--wz-cyan)]">
              Wezcar
            </span>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--wz-primary)]/15 text-sm font-semibold text-[var(--wz-primary)]"
              aria-label="Menu do usuário"
            >
              {user.name.charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-56 rounded-xl border border-[var(--wz-border)] bg-[var(--wz-surface)] p-3 shadow-lg">
                <p className="truncate text-sm font-medium text-[var(--wz-text-primary)]">
                  {user.name}
                </p>
                <p className="truncate text-xs text-[var(--wz-text-secondary)]">{user.email}</p>
                <form action={logout} className="mt-3">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-[var(--wz-text-secondary)] hover:bg-[var(--wz-background)]"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </button>
                </form>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 pb-24 sm:px-6 md:px-8 md:pb-8">
          <div className="mx-auto w-full max-w-3xl">{children}</div>
        </main>

        {/* Bottom tab bar — mobile only */}
        <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-[var(--wz-border)] bg-[var(--wz-surface)] md:hidden">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  isActive(item.href)
                    ? "text-[var(--wz-primary)]"
                    : "text-[var(--wz-text-secondary)]"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
