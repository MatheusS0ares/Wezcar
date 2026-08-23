import { Bell, CheckCircle2, ShieldCheck, Wrench } from "lucide-react";

// A stylized product mockup (built from the same Card/Badge visual language as the real
// app), not a literal screenshot — 2026 SaaS landing research favors real product visuals
// over stock art, but a hand-built mockup ages better than a screenshot that goes stale
// the moment a screen's layout changes.
export function LandingHeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-[var(--wz-primary)]/25 via-[var(--wz-cyan)]/15 to-transparent blur-2xl"
      />

      <div className="animate-[float_6s_ease-in-out_infinite] overflow-hidden rounded-2xl border border-[var(--wz-border)] bg-[var(--wz-surface)]/90 shadow-2xl shadow-blue-950/10 backdrop-blur">
        {/* browser chrome */}
        <div className="flex items-center gap-1.5 border-b border-[var(--wz-border)] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--wz-danger)]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--wz-warning)]/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--wz-success)]/60" />
          <span className="ml-3 truncate text-xs text-[var(--wz-text-secondary)]">
            wezcar.app/veiculos/fiat-argo
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--wz-text-primary)]">Fiat Argo 2022</p>
              <p className="text-xs text-[var(--wz-text-secondary)]">ABC-1D23 · 42.180 km</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wz-success)]/15 px-2.5 py-1 text-xs font-medium text-[var(--wz-success)]">
              <ShieldCheck className="h-3.5 w-3.5" /> Garantia ativa
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--wz-border)] bg-[var(--wz-background)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--wz-text-secondary)]">
                Prazo de entrega
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--wz-text-primary)]">No prazo</p>
            </div>
            <div className="rounded-xl border border-[var(--wz-border)] bg-[var(--wz-background)] p-3">
              <p className="text-[10px] uppercase tracking-wide text-[var(--wz-text-secondary)]">
                Orçamento
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--wz-text-primary)]">Aprovado</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <TimelineRow icon={Wrench} label="Troca de óleo e filtros" meta="há 2 dias · OS #1042" />
            <TimelineRow icon={Bell} label="Veículo pronto para retirada" meta="notificado" />
            <TimelineRow icon={CheckCircle2} label="Revisão dos 40 mil" meta="concluída" muted />
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineRow({
  icon: Icon,
  label,
  meta,
  muted = false,
}: {
  icon: typeof Wrench;
  label: string;
  meta: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--wz-border)] px-3 py-2.5">
      <span
        className={`flex h-8 w-8 flex-none items-center justify-center rounded-full ${
          muted ? "bg-[var(--wz-border)]/50 text-[var(--wz-text-secondary)]" : "bg-[var(--wz-primary)]/15 text-[var(--wz-primary)]"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--wz-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--wz-text-secondary)]">{meta}</p>
      </div>
    </div>
  );
}
