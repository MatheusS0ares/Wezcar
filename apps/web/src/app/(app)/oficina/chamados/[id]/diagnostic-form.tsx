"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { saveDiagnostic } from "./actions";

export function DiagnosticForm({
  serviceRequestId,
  initialSummary,
}: {
  serviceRequestId: string;
  initialSummary: string;
}) {
  const [state, formAction, pending] = useActionState(saveDiagnostic, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="serviceRequestId" value={serviceRequestId} />
      <Textarea
        name="summary"
        defaultValue={initialSummary}
        placeholder="O que foi encontrado no veículo?"
        rows={3}
        required
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando…" : initialSummary ? "Atualizar diagnóstico" : "Salvar diagnóstico"}
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
