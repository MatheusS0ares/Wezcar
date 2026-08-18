"use client";

import { useActionState } from "react";
import { addVehicle, updateMileage } from "./actions";

export function AddVehicleForm() {
  const [state, formAction, pending] = useActionState(addVehicle, null);

  return (
    <form action={formAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <input
        name="brand"
        placeholder="Marca"
        required
        className="col-span-1 rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-sm text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)]"
      />
      <input
        name="model"
        placeholder="Modelo"
        required
        className="col-span-1 rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-sm text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)]"
      />
      <input
        name="plate"
        placeholder="Placa (opcional)"
        className="col-span-1 rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-sm text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)]"
      />
      <input
        name="manufactureYear"
        type="number"
        placeholder="Ano"
        className="col-span-1 rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-sm text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)]"
      />
      <input
        name="mileage"
        type="number"
        placeholder="Quilometragem atual"
        className="col-span-2 rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-2 text-sm text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)] sm:col-span-1"
      />
      <button
        type="submit"
        disabled={pending}
        className="col-span-2 rounded-lg bg-[var(--wz-primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--wz-primary-dark)] disabled:opacity-60 sm:col-span-1"
      >
        {pending ? "Salvando…" : "Cadastrar veículo"}
      </button>

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
      <input
        name="mileage"
        type="number"
        min={currentMileage ?? 0}
        placeholder="Nova quilometragem"
        required
        className="w-40 rounded-lg border border-[var(--wz-border)] bg-[var(--wz-surface)] px-3 py-1.5 text-sm text-[var(--wz-text-primary)] outline-none focus:border-[var(--wz-primary)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-[var(--wz-border)] px-3 py-1.5 text-sm font-medium text-[var(--wz-text-primary)] hover:bg-[var(--wz-background)] disabled:opacity-60"
      >
        {pending ? "Atualizando…" : "Atualizar quilometragem"}
      </button>
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
