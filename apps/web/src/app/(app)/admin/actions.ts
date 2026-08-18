"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createTenantSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da oficina."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífen."),
});

export async function createTenant(_prevState: unknown, formData: FormData) {
  const parsed = createTenantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  // RLS: only succeeds for a user holding the tenant.manage permission
  // (tenants_write_platform_admin policy) — see supabase/migrations/20260818020100_platform_admin.sql.
  const { error } = await supabase.from("tenants").insert(parsed.data);

  if (error) {
    return {
      error: error.message.includes("row-level security")
        ? "Você não tem permissão para criar tenants."
        : error.message,
    };
  }

  revalidatePath("/admin");
  return { success: "Tenant criado." };
}
