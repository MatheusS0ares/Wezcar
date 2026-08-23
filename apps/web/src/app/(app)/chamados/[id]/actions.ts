"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function decideEstimate(estimateId: string, decision: "APPROVED" | "REJECTED") {
  const supabase = await createClient();

  const { data: estimate } = await supabase
    .from("estimates")
    .select("service_request_id")
    .eq("id", estimateId)
    .single();

  const { error } = await supabase
    .from("estimates")
    .update({ status: decision })
    .eq("id", estimateId);

  if (!error && estimate) {
    revalidatePath(`/chamados/${estimate.service_request_id}`);
    revalidatePath("/chamados");
    revalidatePath(`/oficina/chamados/${estimate.service_request_id}`);
  }
}
