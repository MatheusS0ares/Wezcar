"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// Glassmorphism restrained to the navbar (2026 trend research: the aesthetic survived in
// nav bars/modals/cards, not as a dominant hero treatment) — transparent over the hero,
// blurred glass once the user scrolls past it.
export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-300 ${
        scrolled
          ? "border-b border-[var(--wz-border)] bg-[var(--wz-surface)]/70 backdrop-blur-lg"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/wezcar-icon.png" alt="" width={32} height={17} />
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--wz-cyan)]">
            Wezcar
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/entrar"
            className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--wz-text-secondary)] transition-colors hover:text-[var(--wz-text-primary)]"
          >
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="rounded-lg bg-[var(--wz-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-[var(--wz-primary-dark)]"
          >
            Criar conta grátis
          </Link>
        </nav>
      </div>
    </header>
  );
}
