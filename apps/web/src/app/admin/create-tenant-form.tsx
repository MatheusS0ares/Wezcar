"use client";

import { useActionState } from "react";
import { createTenant } from "./actions";

export function CreateTenantForm() {
  const [state, formAction, pending] = useActionState(createTenant, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <input
        name="name"
        placeholder="Nome da oficina"
        required
        className="rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-sm text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)]"
      />
      <input
        name="slug"
        placeholder="slug (ex. oficina-alpha)"
        required
        className="rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-sm text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--wz-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--wz-primary-dark)] disabled:opacity-60"
      >
        {pending ? "Criando…" : "Criar tenant"}
      </button>

      {state?.error && (
        <p className="col-span-full text-sm text-[var(--wz-danger)]" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="col-span-full text-sm text-[var(--wz-success)]" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
