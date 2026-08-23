"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

type PaymentAction = (
  prevState: { error?: string; success?: string } | null,
  formData: FormData,
) => Promise<{ error?: string; success?: string }>;

export function PaymentForm({
  accountId,
  idempotencyKey,
  action,
}: {
  accountId: string;
  idempotencyKey: string;
  action: PaymentAction;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Valor" required className="w-28" />
      <Select name="method" defaultValue="PIX" className="w-32">
        <option value="PIX">PIX</option>
        <option value="CARD">Cartão</option>
        <option value="CASH">Dinheiro</option>
        <option value="TRANSFER">Transferência</option>
        <option value="OTHER">Outro</option>
      </Select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Registrando…" : "Registrar pagamento"}
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
