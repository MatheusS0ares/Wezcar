"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createServiceRequestSchema = z.object({
  vehicleId: z.uuid("Selecione um veículo."),
  tenantId: z.uuid("Selecione uma oficina."),
  description: z.string().trim().min(5, "Descreva o problema (mínimo 5 caracteres)."),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
});

export async function createServiceRequest(_prevState: unknown, formData: FormData) {
  const parsed = createServiceRequestSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    tenantId: formData.get("tenantId"),
    description: formData.get("description"),
    priority: formData.get("priority"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const { error } = await supabase.from("service_requests").insert({
    tenant_id: parsed.data.tenantId,
    customer_id: user.id,
    vehicle_id: parsed.data.vehicleId,
    description: parsed.data.description,
    priority: parsed.data.priority,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/chamados");
  return { success: "Chamado aberto." };
}

export async function cancelServiceRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("service_requests")
    .update({ status: "CANCELED" })
    .eq("id", id);

  if (!error) {
    revalidatePath("/chamados");
  }
}
