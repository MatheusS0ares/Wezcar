"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { createEstimate } from "./actions";

let nextRowKey = 1;

export function EstimateForm({ serviceRequestId }: { serviceRequestId: string }) {
  const [state, formAction, pending] = useActionState(createEstimate, null);
  const [rowKeys, setRowKeys] = useState<number[]>([0]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="serviceRequestId" value={serviceRequestId} />

      <div className="space-y-2">
        {rowKeys.map((key) => (
          <div
            key={key}
            className="grid grid-cols-2 items-center gap-2 rounded-lg border border-[var(--wz-border)] p-3 sm:grid-cols-[1fr_120px_90px_130px_auto]"
          >
            <Input
              name="description"
              placeholder="Descrição (ex. Pastilha de freio dianteira)"
              required
              className="col-span-2 sm:col-span-1"
            />
            <Select name="kind" defaultValue="PART">
              <option value="PART">Peça</option>
              <option value="LABOR">Mão de obra</option>
            </Select>
            <Input name="quantity" type="number" step="0.01" min="0.01" defaultValue="1" required />
            <Input name="unitPrice" type="number" step="0.01" min="0" placeholder="Valor un. (R$)" required />
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

      <Textarea name="notes" placeholder="Observação para o cliente (opcional)" rows={2} />

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar orçamento"}
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
