"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { createAppointment } from "../actions";

export function AppointmentForm({ workOrderId }: { workOrderId: string }) {
  const [state, formAction, pending] = useActionState(createAppointment, null);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="workOrderId" value={workOrderId} />
      <Input name="scheduledAt" type="datetime-local" required className="w-auto" />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Agendando…" : "Agendar execução"}
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
