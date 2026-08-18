"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "./actions";

export default function EntrarPage() {
  const [state, formAction, pending] = useActionState(login, null);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-[var(--wz-text-primary)]">
            Entrar na Wezcar
          </h1>
          <p className="text-sm text-[var(--wz-text-secondary)]">
            A vida do seu carro em um só lugar.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--wz-text-primary)]">
              E-mail
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)] focus:ring-1 focus:ring-[var(--wz-primary)]"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-[var(--wz-text-primary)]">
              Senha
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)] focus:ring-1 focus:ring-[var(--wz-primary)]"
            />
          </label>

          {state?.error && (
            <p className="text-sm text-[var(--wz-danger)]" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[var(--wz-primary)] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[var(--wz-primary-dark)] disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-[var(--wz-text-secondary)]">
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-[var(--wz-primary)]">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
