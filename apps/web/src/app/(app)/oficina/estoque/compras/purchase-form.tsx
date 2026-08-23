"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { createPurchase } from "./actions";

let nextRowKey = 1;

export function PurchaseForm({
  suppliers,
  products,
}: {
  suppliers: { id: string; name: string }[];
  products: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createPurchase, null);
  const [rowKeys, setRowKeys] = useState<number[]>([0]);

  if (!products.length) {
    return (
      <p className="text-sm text-[var(--wz-text-secondary)]">
        Cadastre um produto no estoque antes de registrar uma compra.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <Select name="supplierId" defaultValue="">
        <option value="">Sem fornecedor definido</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </Select>

      <div className="space-y-2">
        {rowKeys.map((key) => (
          <div
            key={key}
            className="grid grid-cols-2 items-center gap-2 rounded-lg border border-[var(--wz-border)] p-3 sm:grid-cols-[1fr_90px_130px_auto]"
          >
            <Select name="productId" defaultValue="" required className="col-span-2 sm:col-span-1">
              <option value="" disabled>
                Produto
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
            <Input name="quantity" type="number" min="1" defaultValue="1" required />
            <Input name="unitCost" type="number" step="0.01" min="0" placeholder="Custo un. (R$)" required />
            {rowKeys.length > 1 && (
              <button
                type="button"
                onClick={() => setRowKeys((keys) => keys.filter((k) => k !== key))}
                className="justify-self-start text-xs text-[var(--wz-text-secondary)] hover:text-[var(--wz-danger)] sm:justify-self-center"
              >
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setRowKeys((keys) => [...keys, nextRowKey++])}
      >
        + Adicionar item
      </Button>

      <Button type="submit" disabled={pending}>
        {pending ? "Registrando…" : "Registrar compra"}
      </Button>

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
    </form>
  );
}
