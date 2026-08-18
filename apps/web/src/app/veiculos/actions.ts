"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const addVehicleSchema = z.object({
  brand: z.string().trim().min(1, "Informe a marca."),
  model: z.string().trim().min(1, "Informe o modelo."),
  plate: z.string().trim().max(10).optional().or(z.literal("")),
  manufactureYear: z.coerce.number().int().min(1900).max(2100).optional().or(z.literal("")),
  mileage: z.coerce.number().int().min(0, "Quilometragem não pode ser negativa.").optional().or(z.literal("")),
});

export async function addVehicle(_prevState: unknown, formData: FormData) {
  const parsed = addVehicleSchema.safeParse({
    brand: formData.get("brand"),
    model: formData.get("model"),
    plate: formData.get("plate"),
    manufactureYear: formData.get("manufactureYear"),
    mileage: formData.get("mileage"),
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

  const { brand, model, plate, manufactureYear, mileage } = parsed.data;

  const { error } = await supabase.from("vehicles").insert({
    customer_id: user.id,
    brand,
    model,
    plate: plate || null,
    manufacture_year: manufactureYear === "" ? null : manufactureYear,
    mileage: mileage === "" ? null : mileage,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/veiculos");
  return { success: "Veículo cadastrado." };
}

const updateMileageSchema = z.object({
  vehicleId: z.uuid(),
  mileage: z.coerce.number().int().min(0, "Quilometragem não pode ser negativa."),
});

export async function updateMileage(_prevState: unknown, formData: FormData) {
  const parsed = updateMileageSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    mileage: formData.get("mileage"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_mileage_history").insert({
    vehicle_id: parsed.data.vehicleId,
    mileage: parsed.data.mileage,
  });

  if (error) {
    return {
      error: error.message.includes("é menor que a atual")
        ? "A nova quilometragem não pode ser menor que a atual."
        : error.message,
    };
  }

  revalidatePath("/veiculos");
  return { success: "Quilometragem atualizada." };
}
