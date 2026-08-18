"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { createTenant } from "./actions";

export function CreateTenantForm() {
  const [state, formAction, pending] = useActionState(createTenant, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Input name="name" placeholder="Nome da oficina" required />
      <Input name="slug" placeholder="slug (ex. oficina-alpha)" required />
      <Button type="submit" disabled={pending}>
        {pending ? "Criando…" : "Criar tenant"}
      </Button>

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
