"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const diagnosticSchema = z.object({
  serviceRequestId: z.uuid(),
  summary: z.string().trim().min(5, "Descreva o diagnóstico (mínimo 5 caracteres)."),
});

export async function saveDiagnostic(_prevState: unknown, formData: FormData) {
  const parsed = diagnosticSchema.safeParse({
    serviceRequestId: formData.get("serviceRequestId"),
    summary: formData.get("summary"),
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

  const { data: request } = await supabase
    .from("service_requests")
    .select("tenant_id, customer_id")
    .eq("id", parsed.data.serviceRequestId)
    .single();

  if (!request) {
    return { error: "Chamado não encontrado." };
  }

  const { data: existing } = await supabase
    .from("diagnostics")
    .select("id")
    .eq("service_request_id", parsed.data.serviceRequestId)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("diagnostics")
        .update({ summary: parsed.data.summary })
        .eq("id", existing.id)
    : await supabase.from("diagnostics").insert({
        tenant_id: request.tenant_id,
        service_request_id: parsed.data.serviceRequestId,
        customer_id: request.customer_id,
        summary: parsed.data.summary,
        created_by: user.id,
      });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/oficina/chamados/${parsed.data.serviceRequestId}`);
  return { success: "Diagnóstico salvo." };
}

const estimateItemSchema = z.object({
  description: z.string().trim().min(2, "Descreva o item."),
  kind: z.enum(["PART", "LABOR"]),
  quantity: z.coerce.number().positive("Quantidade precisa ser maior que zero."),
  unitPrice: z.coerce.number().min(0, "Valor não pode ser negativo."),
  productId: z.uuid().optional().or(z.literal("")),
});

export async function createEstimate(_prevState: unknown, formData: FormData) {
  const serviceRequestId = formData.get("serviceRequestId");
  if (typeof serviceRequestId !== "string" || !serviceRequestId) {
    return { error: "Chamado inválido." };
  }

  // Item rows are submitted as repeated same-name fields (one entry per row, in DOM order),
  // not indexed field names — getAll() preserves that order so zipping by index is safe.
  const descriptions = formData.getAll("description");
  const kinds = formData.getAll("kind");
  const quantities = formData.getAll("quantity");
  const unitPrices = formData.getAll("unitPrice");
  const productIds = formData.getAll("productId");

  const items: z.infer<typeof estimateItemSchema>[] = [];
  for (let i = 0; i < descriptions.length; i++) {
    const parsed = estimateItemSchema.safeParse({
      description: descriptions[i],
      kind: kinds[i],
      quantity: quantities[i],
      unitPrice: unitPrices[i],
      productId: productIds[i],
    });
    if (!parsed.success) {
      return { error: `Item ${i + 1}: ${parsed.error.issues[0]?.message ?? "dados inválidos."}` };
    }
    items.push(parsed.data);
  }

  if (!items.length) {
    return { error: "Adicione ao menos um item ao orçamento." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sessão expirada. Entre novamente." };
  }

  const { data: request } = await supabase
    .from("service_requests")
    .select("tenant_id, customer_id")
    .eq("id", serviceRequestId)
    .single();

  if (!request) {
    return { error: "Chamado não encontrado." };
  }

  const notesRaw = formData.get("notes");
  const notes = typeof notesRaw === "string" && notesRaw.trim() ? notesRaw.trim() : null;

  const { data: estimate, error: estimateError } = await supabase
    .from("estimates")
    .insert({
      tenant_id: request.tenant_id,
      service_request_id: serviceRequestId,
      customer_id: request.customer_id,
      notes,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (estimateError || !estimate) {
    return { error: estimateError?.message ?? "Não foi possível criar o orçamento." };
  }

  const { error: itemsError } = await supabase.from("estimate_items").insert(
    items.map((item) => ({
      estimate_id: estimate.id,
      kind: item.kind,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      product_id: item.productId || null,
    })),
  );

  if (itemsError) {
    return { error: `Orçamento criado, mas houve um erro ao salvar os itens: ${itemsError.message}` };
  }

  revalidatePath(`/oficina/chamados/${serviceRequestId}`);
  revalidatePath("/oficina/chamados");
  revalidatePath(`/chamados/${serviceRequestId}`);
  revalidatePath("/chamados");
  return { success: "Orçamento enviado ao cliente." };
}
