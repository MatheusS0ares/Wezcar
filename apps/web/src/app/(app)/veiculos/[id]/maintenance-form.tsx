"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { addManualMaintenanceRecord } from "./actions";

export function MaintenanceForm({ vehicleId }: { vehicleId: string }) {
  const [state, formAction, pending] = useActionState(addManualMaintenanceRecord, null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Textarea
        name="description"
        placeholder="O que foi feito? (ex. Troca de pneus na Oficina X)"
        rows={2}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input name="performedAt" type="date" defaultValue={today} max={today} required />
        <Input name="mileage" type="number" min={0} placeholder="Quilometragem (opcional)" />
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Registrar manutenção"}
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
