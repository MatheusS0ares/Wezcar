"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo."),
  email: z.email("E-mail inválido."),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres."),
});

export async function signup(_prevState: unknown, formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password } = parsed.data;
  const supabase = await createClient();

  // No tenant_id in metadata: this public form only creates customer accounts
  // (Wezcar App). Workshop staff accounts are provisioned separately (invite flow, TBD).
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      success: "Cadastro criado! Verifique seu e-mail para confirmar a conta antes de entrar.",
    };
  }

  redirect("/painel");
}
