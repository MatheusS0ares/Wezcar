"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addVehicle, updateMileage } from "./actions";

export function AddVehicleForm() {
  const [state, formAction, pending] = useActionState(addVehicle, null);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Input name="brand" placeholder="Marca" required className="col-span-1" />
      <Input name="model" placeholder="Modelo" required className="col-span-1" />
      <Input name="plate" placeholder="Placa (opcional)" className="col-span-1" />
      <Input name="manufactureYear" type="number" placeholder="Ano" className="col-span-1" />
      <Input
        name="mileage"
        type="number"
        placeholder="Quilometragem atual"
        className="col-span-2 sm:col-span-1"
      />
      <Button type="submit" disabled={pending} className="col-span-2 sm:col-span-1">
        {pending ? "Salvando…" : "Cadastrar veículo"}
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

export function MileageForm({ vehicleId, currentMileage }: { vehicleId: string; currentMileage: number | null }) {
  const [state, formAction, pending] = useActionState(updateMileage, null);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <Input
        name="mileage"
        type="number"
        min={currentMileage ?? 0}
        placeholder="Nova quilometragem"
        required
        className="w-40"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Atualizando…" : "Atualizar quilometragem"}
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
