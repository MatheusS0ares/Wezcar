"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addSupplier } from "./actions";

export function SupplierForm() {
  const [state, formAction, pending] = useActionState(addSupplier, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <Input name="name" placeholder="Nome do fornecedor" required className="w-52" />
      <Input name="phone" placeholder="Telefone (opcional)" className="w-40" />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Cadastrar fornecedor"}
      </Button>

      {state?.error && (
        <span className="text-sm text-[var(--wz-danger)]" role="alert">
          {state.error}
        </span>
      )}
      {state?.success && (
        <span className="text-sm text-[var(--wz-success)]" role="status">
          {state.success}
        </span>
      )}
    </form>
  );
}
