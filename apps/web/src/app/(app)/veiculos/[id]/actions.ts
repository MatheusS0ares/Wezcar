"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const maintenanceSchema = z.object({
  vehicleId: z.uuid(),
  description: z.string().trim().min(3, "Descreva a manutenção (mínimo 3 caracteres)."),
  mileage: z.coerce.number().int().min(0, "Quilometragem não pode ser negativa.").optional().or(z.literal("")),
  performedAt: z.string().min(1, "Informe a data."),
});

export async function addManualMaintenanceRecord(_prevState: unknown, formData: FormData) {
  const parsed = maintenanceSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    description: formData.get("description"),
    mileage: formData.get("mileage"),
    performedAt: formData.get("performedAt"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const performedDate = new Date(parsed.data.performedAt);
  if (Number.isNaN(performedDate.getTime())) {
    return { error: "Data inválida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { mileage, description, vehicleId } = parsed.data;

  const { error } = await supabase.from("maintenance_records").insert({
    vehicle_id: vehicleId,
    source: "MANUAL",
    description,
    mileage: mileage === "" ? null : mileage,
    performed_at: performedDate.toISOString(),
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/veiculos/${vehicleId}`);
  return { success: "Manutenção registrada." };
}
