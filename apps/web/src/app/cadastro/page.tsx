"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { signup } from "./actions";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState(signup, null);

  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-[var(--wz-text-primary)]">
            Criar conta na Wezcar
          </h1>
          <p className="text-sm text-[var(--wz-text-secondary)]">
            A vida do seu carro em um só lugar.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <Field label="Nome completo" name="name" type="text" autoComplete="name" />
          <Field label="E-mail" name="email" type="email" autoComplete="email" />
          <Field
            label="Senha"
            name="password"
            type="password"
            autoComplete="new-password"
          />

          {state?.error && (
            <p className="text-sm text-[var(--wz-danger)]" role="alert">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="text-sm text-[var(--wz-success)]" role="status">
              {state.success}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[var(--wz-primary)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--wz-primary-dark)] disabled:opacity-60"
          >
            {pending ? "Criando conta…" : "Criar conta"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--wz-text-secondary)]">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-[var(--wz-primary)]">
            Entrar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-[var(--wz-text-primary)]">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)] focus:ring-1 focus:ring-[var(--wz-primary)]"
      />
    </label>
  );
}
