"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const addProductSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto."),
  sku: z.string().trim().max(50).optional().or(z.literal("")),
  unitPrice: z.coerce.number().min(0).optional().or(z.literal("")),
  minStock: z.coerce.number().int().min(0).optional().or(z.literal("")),
});

export async function addProduct(_prevState: unknown, formData: FormData) {
  const parsed = addProductSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    unitPrice: formData.get("unitPrice"),
    minStock: formData.get("minStock"),
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

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) {
    return { error: "Só staff de uma oficina pode cadastrar produtos." };
  }

  const { sku, name, unitPrice, minStock } = parsed.data;

  const { error } = await supabase.from("products").insert({
    tenant_id: profile.tenant_id,
    name,
    sku: sku || null,
    unit_price: unitPrice === "" ? null : unitPrice,
    min_stock: minStock === "" ? 0 : minStock,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/oficina/estoque");
  return { success: "Produto cadastrado." };
}

const adjustStockSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().refine((v) => v !== 0, "Informe uma quantidade diferente de zero."),
  notes: z.string().trim().min(3, "Descreva o motivo do ajuste."),
});

export async function adjustStock(_prevState: unknown, formData: FormData) {
  const parsed = adjustStockSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product } = await supabase
    .from("products")
    .select("tenant_id")
    .eq("id", parsed.data.productId)
    .single();

  if (!product) {
    return { error: "Produto não encontrado." };
  }

  const { error } = await supabase.from("inventory_movements").insert({
    tenant_id: product.tenant_id,
    product_id: parsed.data.productId,
    type: "ADJUSTMENT",
    quantity: parsed.data.quantity,
    notes: parsed.data.notes,
    created_by: user?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/oficina/estoque");
  return { success: "Estoque ajustado." };
}
