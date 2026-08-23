"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function acceptServiceRequest(id: string) {
  const supabase = await createClient();
  await supabase.from("service_requests").update({ status: "ACCEPTED" }).eq("id", id);
  revalidatePath("/oficina/chamados");
  revalidatePath("/oficina");
}

export async function rejectServiceRequest(id: string) {
  const supabase = await createClient();
  await supabase.from("service_requests").update({ status: "REJECTED" }).eq("id", id);
  revalidatePath("/oficina/chamados");
  revalidatePath("/oficina");
}

export async function createWorkOrderFromServiceRequest(serviceRequestId: string) {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("service_requests")
    .select("tenant_id, customer_id, vehicle_id")
    .eq("id", serviceRequestId)
    .single();

  if (!request) return;

  // RN-EST-002: a work order from a chamado requires an approved estimate — also enforced by
  // work_orders_enforce_approved_estimate (trigger, defense in depth). Looked up here just to
  // stamp the traceability link; the insert still fails on its own if this comes back empty.
  const { data: approvedEstimate } = await supabase
    .from("estimates")
    .select("id")
    .eq("service_request_id", serviceRequestId)
    .eq("status", "APPROVED")
    .maybeSingle();

  await supabase.from("work_orders").insert({
    tenant_id: request.tenant_id,
    service_request_id: serviceRequestId,
    customer_id: request.customer_id,
    vehicle_id: request.vehicle_id,
    estimate_id: approvedEstimate?.id ?? null,
  });

  revalidatePath("/oficina/chamados");
  revalidatePath(`/oficina/chamados/${serviceRequestId}`);
  revalidatePath("/oficina/os");
  revalidatePath("/oficina");
}

const NEXT_STATUS: Record<string, string> = {
  OPEN: "IN_PROGRESS",
  IN_PROGRESS: "READY",
  READY: "DELIVERED",
};

export async function advanceWorkOrder(id: string, currentStatus: string) {
  const next = NEXT_STATUS[currentStatus];
  if (!next) return;

  const supabase = await createClient();
  await supabase.from("work_orders").update({ status: next }).eq("id", id);
  revalidatePath("/oficina/os");
  revalidatePath("/oficina");
}

export async function cancelWorkOrder(id: string) {
  const supabase = await createClient();
  await supabase.from("work_orders").update({ status: "CANCELED" }).eq("id", id);
  revalidatePath("/oficina/os");
  revalidatePath("/oficina");
}

const appointmentSchema = z.object({
  workOrderId: z.uuid(),
  scheduledAt: z.string().min(1, "Escolha data e horário."),
});

export async function createAppointment(_prevState: unknown, formData: FormData) {
  const parsed = appointmentSchema.safeParse({
    workOrderId: formData.get("workOrderId"),
    scheduledAt: formData.get("scheduledAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const scheduledDate = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return { error: "Data/horário inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: workOrder } = await supabase
    .from("work_orders")
    .select("tenant_id, customer_id")
    .eq("id", parsed.data.workOrderId)
    .single();

  if (!workOrder) {
    return { error: "OS não encontrada." };
  }

  const { error } = await supabase.from("appointments").insert({
    tenant_id: workOrder.tenant_id,
    work_order_id: parsed.data.workOrderId,
    customer_id: workOrder.customer_id,
    scheduled_at: scheduledDate.toISOString(),
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/oficina/os");
  return { success: "Execução agendada." };
}

const slaDefinitionSchema = z.object({
  tenantId: z.uuid(),
  defaultHours: z.coerce.number().int().positive("Informe um número de horas maior que zero."),
});

export async function updateSlaDefinition(_prevState: unknown, formData: FormData) {
  const parsed = slaDefinitionSchema.safeParse({
    tenantId: formData.get("tenantId"),
    defaultHours: formData.get("defaultHours"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sla_definitions")
    .select("id")
    .eq("tenant_id", parsed.data.tenantId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("sla_definitions")
        .update({ default_hours: parsed.data.defaultHours })
        .eq("id", existing.id)
    : await supabase.from("sla_definitions").insert({
        tenant_id: parsed.data.tenantId,
        default_hours: parsed.data.defaultHours,
      });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/oficina");
  return { success: "SLA padrão atualizado." };
}
