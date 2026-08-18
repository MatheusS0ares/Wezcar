import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-[var(--wz-cyan)]">
        Wezcar
      </p>
      <h1 className="mt-3 max-w-xl text-4xl font-semibold text-[var(--wz-text-primary)]">
        A vida do seu carro em um só lugar.
      </h1>
      <p className="mt-4 max-w-md text-[var(--wz-text-secondary)]">
        Manutenções, oficinas, orçamentos e histórico do veículo — tudo acompanhado em
        um único lugar.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/cadastro"
          className="rounded-lg bg-[var(--wz-primary)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--wz-primary-dark)]"
        >
          Criar conta
        </Link>
        <Link
          href="/entrar"
          className="rounded-lg border border-[var(--wz-border)] px-5 py-2.5 font-medium text-[var(--wz-text-primary)] hover:bg-[var(--wz-surface)]"
        >
          Entrar
        </Link>
      </div>
    </div>
  );
}
