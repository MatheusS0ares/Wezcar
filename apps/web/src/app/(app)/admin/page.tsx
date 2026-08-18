import { redirect } from "next/navigation";
import { Warehouse } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CreateTenantForm } from "./create-tenant-form";

export default async function AdminPage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  if (!ctx.isPlatformAdmin) {
    redirect("/painel");
  }

  const supabase = await createClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("id, name, slug, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Wezcar Admin" description="Tenants (oficinas) da plataforma." />

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">
            Criar tenant (oficina)
          </h2>
        </CardHeader>
        <CardBody>
          <CreateTenantForm />
        </CardBody>
      </Card>

      {tenants?.length ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
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
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-[var(--wz-border)] last:border-0">
                    <td className="p-3 text-[var(--wz-text-primary)]">{tenant.name}</td>
                    <td className="p-3 text-[var(--wz-text-secondary)]">{tenant.slug}</td>
                    <td className="p-3">
                      <StatusBadge status={tenant.status} />
                    </td>
                    <td className="p-3 text-[var(--wz-text-secondary)]">
                      {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState icon={Warehouse} title="Nenhum tenant cadastrado" />
      )}
    </div>
  );
}
