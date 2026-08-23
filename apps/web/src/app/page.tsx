import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Car,
  ClipboardCheck,
  Landmark,
  Lock,
  ScrollText,
  ShieldCheck,
  Timer,
  Warehouse,
} from "lucide-react";
import { LandingNavbar } from "@/components/landing-navbar";
import { LandingHeroVisual } from "@/components/landing-hero-visual";
import { Reveal } from "@/components/reveal";

const FEATURES = [
  {
    icon: Car,
    title: "Vida do Carro",
    description:
      "Histórico de manutenções e garantias pertence ao veículo, não à oficina — o motorista leva pra onde for.",
    span: "lg:col-span-2",
  },
  {
    icon: ClipboardCheck,
    title: "Diagnóstico & Orçamento",
    description: "Orçamento versionado: o cliente aprova, a oficina executa, tudo fica registrado.",
    span: "",
  },
  {
    icon: Timer,
    title: "Agenda & SLA",
    description: "Prazo de entrega calculado automaticamente, com alerta antes de estourar.",
    span: "",
  },
  {
    icon: Landmark,
    title: "Financeiro",
    description:
      "Contas a pagar e receber com pagamentos idempotentes — reenviar o mesmo pagamento nunca duplica a baixa.",
    span: "lg:col-span-2",
  },
  {
    icon: Warehouse,
    title: "Estoque & Compras",
    description: "Saldo de peças sempre correto, com entrada e saída auditáveis.",
    span: "",
  },
  {
    icon: Bell,
    title: "Notificações",
    description: "Cliente e oficina avisados automaticamente a cada etapa do fluxo.",
    span: "",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Abra um chamado",
    description: "Descreva o problema e escolha a oficina — leva menos de um minuto.",
  },
  {
    number: "02",
    title: "Acompanhe o orçamento",
    description: "Aprove ou recuse cada versão e veja o prazo de entrega em tempo real.",
  },
  {
    number: "03",
    title: "Fica no histórico",
    description: "Manutenção e garantia ficam registradas no veículo — pra sempre.",
  },
];

const TRUST_BADGES = [
  { icon: Lock, label: "Isolamento multi-tenant" },
  { icon: ShieldCheck, label: "Row-Level Security" },
  { icon: Landmark, label: "Pagamentos idempotentes" },
  { icon: ScrollText, label: "Trilha de auditoria" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col overflow-x-hidden">
      {/* Reveal fades sections in via IntersectionObserver; without JS they'd stay
          permanently at opacity-0, so force them visible when there's no JS to reveal them. */}
      <noscript>
        <style>{`.js-reveal { opacity: 1 !important; transform: none !important; }`}</style>
      </noscript>

      <LandingNavbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--wz-primary),transparent)] opacity-[0.12]"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 sm:py-24 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center rounded-full border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-1 text-xs font-medium text-[var(--wz-text-secondary)]">
              Plataforma completa para motoristas e oficinas
            </span>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[var(--wz-text-primary)] sm:text-5xl lg:text-6xl">
              A vida do seu carro,{" "}
              <span className="bg-gradient-to-r from-[var(--wz-primary)] to-[var(--wz-cyan)] bg-clip-text text-transparent">
                em um só lugar
              </span>
              .
            </h1>

            <p className="mt-6 max-w-lg text-lg text-[var(--wz-text-secondary)]">
              Diagnóstico, orçamento, agenda, estoque e financeiro — motorista e oficina
              acompanham tudo em tempo real, do primeiro chamado à garantia.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/cadastro"
                className="group inline-flex items-center gap-2 rounded-lg bg-[var(--wz-primary)] px-5 py-3 font-medium text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-[var(--wz-primary-dark)] hover:shadow-blue-600/30"
              >
                Criar conta grátis
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/entrar"
                className="rounded-lg border border-[var(--wz-border)] px-5 py-3 font-medium text-[var(--wz-text-primary)] transition-colors hover:bg-[var(--wz-surface)]"
              >
                Já tenho conta
              </Link>
            </div>
            <p className="mt-3 text-sm text-[var(--wz-text-secondary)]">
              Grátis para motoristas · Sem cartão de crédito · Leva menos de 1 minuto
            </p>
          </div>

          <Reveal delay={150}>
            <LandingHeroVisual />
          </Reveal>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <Reveal>
        <section className="border-y border-[var(--wz-border)] bg-[var(--wz-surface)]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-6">
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge.label}
                className="flex items-center gap-2 text-sm font-medium text-[var(--wz-text-secondary)]"
              >
                <badge.icon className="h-4 w-4 text-[var(--wz-primary)]" />
                {badge.label}
              </span>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── Feature bento grid ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-[var(--wz-text-primary)] sm:text-4xl">
              Um ecossistema, não um sistema a mais
            </h2>
            <p className="mt-4 text-[var(--wz-text-secondary)]">
              Cada módulo já nasce integrado — o que acontece na oficina aparece pro
              motorista, e vice-versa.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 60} className={feature.span}>
              <div className="group h-full rounded-2xl border border-[var(--wz-border)] bg-[var(--wz-surface)] p-6 transition-all hover:border-[var(--wz-primary)]/40 hover:shadow-lg hover:shadow-blue-950/5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--wz-primary)]/10 text-[var(--wz-primary)] transition-colors group-hover:bg-[var(--wz-primary)] group-hover:text-white">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[var(--wz-text-primary)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--wz-text-secondary)]">{feature.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-[var(--wz-border)] bg-[var(--wz-surface)]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <Reveal>
            <h2 className="text-center text-3xl font-semibold tracking-tight text-[var(--wz-text-primary)] sm:text-4xl">
              Como funciona
            </h2>
          </Reveal>

          <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <Reveal key={step.number} delay={i * 100}>
                <div className="relative">
                  <span className="text-5xl font-bold text-[var(--wz-primary)]/15">
                    {step.number}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--wz-text-primary)]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--wz-text-secondary)]">{step.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 sm:py-28">
        <Reveal>
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--wz-primary)] via-[var(--wz-primary-dark)] to-slate-900 px-8 py-16 text-center shadow-2xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(255,255,255,0.15),transparent)]"
            />
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">
              Pronto pra ter o carro sob controle?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-blue-100">
              Crie sua conta gratuita e acompanhe manutenção, garantia e orçamento em um só
              lugar.
            </p>
            <Link
              href="/cadastro"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-medium text-[var(--wz-primary-dark)] shadow-lg transition-transform hover:scale-[1.03]"
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--wz-border)] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-[var(--wz-text-secondary)] sm:flex-row">
          <span>© {new Date().getFullYear()} Wezcar. A vida do seu carro em um só lugar.</span>
          <Link href="/entrar" className="font-medium text-[var(--wz-primary)]">
            Entrar na plataforma
          </Link>
        </div>
      </footer>
    </div>
  );
}
