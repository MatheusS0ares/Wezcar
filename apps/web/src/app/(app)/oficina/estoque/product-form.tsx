"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addProduct } from "./actions";

export function ProductForm() {
  const [state, formAction, pending] = useActionState(addProduct, null);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Input name="name" placeholder="Nome do produto" required className="col-span-2 sm:col-span-1" />
      <Input name="sku" placeholder="SKU (opcional)" />
      <Input name="unitPrice" type="number" step="0.01" min="0" placeholder="Preço de venda" />
      <Input name="minStock" type="number" min="0" placeholder="Estoque mínimo" />
      <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
        {pending ? "Salvando…" : "Cadastrar produto"}
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
