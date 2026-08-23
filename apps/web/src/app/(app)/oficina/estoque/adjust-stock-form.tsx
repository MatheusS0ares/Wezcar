"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { adjustStock } from "./actions";

export function AdjustStockForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState(adjustStock, null);

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="productId" value={productId} />
      <Input
        name="quantity"
        type="number"
        placeholder="+/- qtd"
        required
        className="w-24"
      />
      <Input name="notes" placeholder="Motivo do ajuste" required className="w-40" />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Ajustando…" : "Ajustar"}
      </Button>

      {state?.error && (
        <span className="text-xs text-[var(--wz-danger)]" role="alert">
          {state.error}
        </span>
      )}
      {state?.success && (
        <span className="text-xs text-[var(--wz-success)]" role="status">
          {state.success}
        </span>
      )}
    </form>
  );
}
