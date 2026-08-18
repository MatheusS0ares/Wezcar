"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { createServiceRequest } from "./actions";

export function ServiceRequestForm({
  vehicles,
  tenants,
}: {
  vehicles: { id: string; brand: string; model: string }[];
  tenants: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createServiceRequest, null);

  if (!vehicles.length) {
    return (
      <p className="text-sm text-[var(--wz-text-secondary)]">
        Cadastre um veículo antes de abrir um chamado.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select name="vehicleId" required defaultValue="">
          <option value="" disabled>
            Veículo
          </option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.brand} {vehicle.model}
            </option>
          ))}
        </Select>

        <Select name="tenantId" required defaultValue="">
          <option value="" disabled>
            Oficina
          </option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))}
        </Select>
      </div>

      <Textarea name="description" placeholder="Descreva o problema" rows={3} required />

      <Select name="priority" defaultValue="NORMAL" className="w-40">
        <option value="LOW">Baixa</option>
        <option value="NORMAL">Normal</option>
        <option value="HIGH">Alta</option>
        <option value="URGENT">Urgente</option>
      </Select>

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Abrir chamado"}
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
