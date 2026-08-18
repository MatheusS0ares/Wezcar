"use server";

import { revalidatePath } from "next/cache";
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

  await supabase.from("work_orders").insert({
    tenant_id: request.tenant_id,
    service_request_id: serviceRequestId,
    customer_id: request.customer_id,
    vehicle_id: request.vehicle_id,
  });

  revalidatePath("/oficina/chamados");
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
