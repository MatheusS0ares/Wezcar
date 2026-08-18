import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateTenantForm } from "./create-tenant-form";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: isPlatformAdmin } = await supabase.rpc("has_permission", {
    permission_code: "platform.super_admin",
  });

  if (!isPlatformAdmin) {
    redirect("/painel");
  }

  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--wz-text-primary)]">Wezcar Admin</h1>
        <Link
          href="/painel"
          className="text-sm font-medium text-[var(--wz-text-secondary)] hover:text-[var(--wz-primary)]"
        >
          ← Painel
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-[var(--wz-border)] bg-[var(--wz-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--wz-text-primary)]">
          Criar tenant (oficina)
        </h2>
        <CreateTenantForm />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--wz-border)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--wz-border)] text-left text-xs uppercase tracking-wide text-[var(--wz-text-secondary)]">
              <th className="p-3">Nome</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Status</th>
              <th className="p-3">Criado em</th>
            </tr>
          </thead>
          <tbody>
            {tenants?.map((tenant) => (
              <tr key={tenant.id} className="border-b border-[var(--wz-border)] last:border-0">
                <td className="p-3 text-[var(--wz-text-primary)]">{tenant.name}</td>
                <td className="p-3 text-[var(--wz-text-secondary)]">{tenant.slug}</td>
                <td className="p-3 text-[var(--wz-text-secondary)]">{tenant.status}</td>
                <td className="p-3 text-[var(--wz-text-secondary)]">
                  {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
            {!tenants?.length && (
              <tr>
                <td colSpan={4} className="p-3 text-[var(--wz-text-secondary)]">
                  Nenhum tenant cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
