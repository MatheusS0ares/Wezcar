import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/entrar/actions";

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, phone, status, tenant_id, created_at")
    .eq("id", user.id)
    .single();

  const { data: tenant } = profile?.tenant_id
    ? await supabase
        .from("tenants")
        .select("name, slug")
        .eq("id", profile.tenant_id)
        .single()
    : { data: null };

  const { data: isPlatformAdmin } = await supabase.rpc("has_permission", {
    permission_code: "platform.super_admin",
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--wz-text-primary)]">Painel</h1>
        <div className="flex items-center gap-2">
          {isPlatformAdmin && (
            <Link
              href="/admin"
              className="rounded-lg border border-[var(--wz-border)] px-4 py-2 text-sm font-medium text-[var(--wz-text-primary)] hover:bg-[var(--wz-background)]"
            >
              Wezcar Admin
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-[var(--wz-border)] px-4 py-2 text-sm font-medium text-[var(--wz-text-secondary)] hover:bg-[var(--wz-surface)]"
            >
              Sair
            </button>
          </form>
        </div>
      </div>

      <Link
        href="/veiculos"
        className="mb-4 flex items-center justify-between rounded-xl border border-[var(--wz-border)] bg-[var(--wz-surface)] p-4 hover:border-[var(--wz-primary)]"
      >
        <span className="font-medium text-[var(--wz-text-primary)]">Meus veículos</span>
        <span className="text-[var(--wz-text-secondary)]">→</span>
      </Link>

      <dl className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--wz-border)] bg-[var(--wz-surface)] p-6 sm:grid-cols-2">
        <Field label="Nome" value={profile?.name ?? "—"} />
        <Field label="E-mail" value={profile?.email ?? user.email ?? "—"} />
        <Field label="Telefone" value={profile?.phone ?? "—"} />
        <Field label="Status" value={profile?.status ?? "—"} />
        <Field
          label="Tenant (oficina)"
          value={tenant ? `${tenant.name} (${tenant.slug})` : "Nenhum — conta de cliente"}
        />
        <Field
          label="Conta criada em"
          value={
            profile?.created_at
              ? new Date(profile.created_at).toLocaleString("pt-BR")
              : "—"
          }
        />
      </dl>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--wz-text-secondary)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[var(--wz-text-primary)]">{value}</dd>
    </div>
  );
}
