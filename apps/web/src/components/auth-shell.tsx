import Image from "next/image";
import Link from "next/link";
import { CarIllustration } from "@/components/car-illustration";

// Split-screen auth layout (car-rental/fleet-account convention — a branded photo/art panel
// on one side, the form on the other), used by both /entrar and /cadastro. Mobile collapses
// to a single column with a short brand banner instead of the full panel — the target user
// tests exclusively on phone (ADR 0003), so the desktop-only half of this can't be the only
// thing that carries the branding.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--wz-primary-dark)] via-[var(--wz-primary)] to-slate-900 px-8 py-8 text-white lg:w-1/2 lg:px-14 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_0%,rgba(255,255,255,0.18),transparent)]"
        />

        <Link href="/" className="relative flex items-center gap-2">
          <Image src="/wezcar-icon.png" alt="" width={30} height={16} />
          <span className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
            Wezcar
          </span>
        </Link>

        <div className="relative mx-auto w-full max-w-sm py-10 lg:py-0">
          <CarIllustration className="w-full drop-shadow-2xl" />
        </div>

        <div className="relative max-w-sm">
          <p className="text-xl font-semibold sm:text-2xl">
            A vida do seu carro em um só lugar.
          </p>
          <p className="mt-2 text-sm text-blue-100">
            Diagnóstico, orçamento, agenda e histórico — motorista e oficina acompanham tudo
            em tempo real.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 lg:w-1/2 lg:px-8">
        {children}
      </div>
    </div>
  );
}
