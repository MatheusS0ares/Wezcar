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

const paymentSchema = z.object({
  accountId: z.uuid(),
  amount: z.coerce.number().positive("Valor precisa ser maior que zero."),
  method: z.enum(["PIX", "CARD", "CASH", "TRANSFER", "OTHER"]),
  idempotencyKey: z.string().min(1),
});

async function registerPayment(
  formData: FormData,
  accountColumn: "receivable_id" | "payable_id",
) {
  const parsed = paymentSchema.safeParse({
    accountId: formData.get("accountId"),
    amount: formData.get("amount"),
    method: formData.get("method"),
    idempotencyKey: formData.get("idempotencyKey"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const tenantId = await getTenantId(supabase);

  if (!tenantId) {
    return { error: "Só staff de uma oficina pode registrar pagamentos." };
  }

  const base = {
    tenant_id: tenantId,
    amount: parsed.data.amount,
    method: parsed.data.method,
    idempotency_key: parsed.data.idempotencyKey,
    created_by: user?.id ?? null,
  };

  const { error } = await supabase.from("payments").insert(
    accountColumn === "receivable_id"
      ? { ...base, receivable_id: parsed.data.accountId }
      : { ...base, payable_id: parsed.data.accountId },
  );

  if (error) {
    // Unique violation on (tenant_id, idempotency_key) — RN-FIN-001: a repeated submission
    // (double-click, retry) is not a new payment, it's the same one already recorded.
    if (error.code === "23505") {
      revalidatePath("/oficina/financeiro");
      return { success: "Pagamento já registrado." };
    }
    return { error: error.message };
  }

  revalidatePath("/oficina/financeiro");
  return { success: "Pagamento registrado." };
}

export async function registerReceivablePayment(_prevState: unknown, formData: FormData) {
  return registerPayment(formData, "receivable_id");
}

export async function registerPayablePayment(_prevState: unknown, formData: FormData) {
  return registerPayment(formData, "payable_id");
}
