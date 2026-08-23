"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function getTenantId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  return profile?.tenant_id ?? null;
}

const addSupplierSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do fornecedor."),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function addSupplier(_prevState: unknown, formData: FormData) {
  const parsed = addSupplierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const tenantId = await getTenantId(supabase);

  if (!tenantId) {
    return { error: "Só staff de uma oficina pode cadastrar fornecedores." };
  }

  const { error } = await supabase.from("suppliers").insert({
    tenant_id: tenantId,
    name: parsed.data.name,
    phone: parsed.data.phone || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/oficina/estoque/compras");
  return { success: "Fornecedor cadastrado." };
}

const purchaseItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.coerce.number().int().positive("Quantidade precisa ser maior que zero."),
  unitCost: z.coerce.number().min(0, "Custo não pode ser negativo."),
});

export async function createPurchase(_prevState: unknown, formData: FormData) {
  const supplierIdRaw = formData.get("supplierId");
  const supplierId = typeof supplierIdRaw === "string" && supplierIdRaw ? supplierIdRaw : null;

  const productIds = formData.getAll("productId");
  const quantities = formData.getAll("quantity");
  const unitCosts = formData.getAll("unitCost");

  const items: z.infer<typeof purchaseItemSchema>[] = [];
  for (let i = 0; i < productIds.length; i++) {
    const parsed = purchaseItemSchema.safeParse({
      productId: productIds[i],
      quantity: quantities[i],
      unitCost: unitCosts[i],
    });
    if (!parsed.success) {
      return { error: `Item ${i + 1}: ${parsed.error.issues[0]?.message ?? "dados inválidos."}` };
    }
    items.push(parsed.data);
  }

  if (!items.length) {
    return { error: "Adicione ao menos um item à compra." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = await getTenantId(supabase);

  if (!tenantId) {
    return { error: "Só staff de uma oficina pode criar compras." };
  }

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .insert({ tenant_id: tenantId, supplier_id: supplierId, created_by: user?.id ?? null })
    .select("id")
    .single();

  if (purchaseError || !purchase) {
    return { error: purchaseError?.message ?? "Não foi possível criar a compra." };
  }

  const { error: itemsError } = await supabase.from("purchase_items").insert(
    items.map((item) => ({
      purchase_id: purchase.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_cost: item.unitCost,
    })),
  );

  if (itemsError) {
    return { error: `Compra criada, mas houve um erro ao salvar os itens: ${itemsError.message}` };
  }

  revalidatePath("/oficina/estoque/compras");
  return { success: "Compra registrada." };
}

export async function receivePurchase(purchaseId: string) {
  const supabase = await createClient();
  await supabase.from("purchases").update({ status: "RECEIVED" }).eq("id", purchaseId);
  revalidatePath("/oficina/estoque/compras");
  revalidatePath("/oficina/estoque");
}

export async function cancelPurchase(purchaseId: string) {
  const supabase = await createClient();
  await supabase.from("purchases").update({ status: "CANCELED" }).eq("id", purchaseId);
  revalidatePath("/oficina/estoque/compras");
}
