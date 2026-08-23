"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { updateSlaDefinition } from "./actions";

export function SlaSettingsForm({
  tenantId,
  currentHours,
}: {
  tenantId: string;
  currentHours: number;
}) {
  const [state, formAction, pending] = useActionState(updateSlaDefinition, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="tenantId" value={tenantId} />
      <div>
        <label htmlFor="defaultHours" className="mb-1.5 block text-sm font-medium text-[var(--wz-text-primary)]">
          SLA padrão (horas)
        </label>
        <Input
          id="defaultHours"
          name="defaultHours"
          type="number"
          min={1}
          defaultValue={currentHours}
          required
          className="w-28"
        />
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Salvar"}
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
