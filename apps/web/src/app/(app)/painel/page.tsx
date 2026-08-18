import Link from "next/link";
import { redirect } from "next/navigation";
import { Car, ShieldCheck, Warehouse, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function PainelPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const [{ data: profile }, { data: isWorkshopStaff }, { data: isPlatformAdmin }] =
    await Promise.all([
      supabase
        .from("users")
        .select("name, email, phone, status, tenant_id, created_at")
        .eq("id", user.id)
        .single(),
      supabase.rpc("has_permission", { permission_code: "work_order.update" }),
      supabase.rpc("has_permission", { permission_code: "platform.super_admin" }),
    ]);

  const { data: tenant } = profile?.tenant_id
    ? await supabase.from("tenants").select("name, slug").eq("id", profile.tenant_id).single()
    : { data: null };

  return (
    <div>
      <PageHeader
        title={`Olá, ${profile?.name?.split(" ")[0] ?? "aí"}`}
        description="A vida do seu carro em um só lugar."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ShortcutCard href="/veiculos" icon={Car} label="Meus veículos" />
        <ShortcutCard href="/chamados" icon={Wrench} label="Chamados" />
        {isWorkshopStaff && (
          <ShortcutCard href="/oficina" icon={Warehouse} label="Oficina" />
        )}
        {isPlatformAdmin && (
          <ShortcutCard href="/admin" icon={ShieldCheck} label="Wezcar Admin" />
        )}
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </CardBody>
      </Card>
    </div>
  );
}

function ShortcutCard({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Car;
  label: string;
}) {
  return (
    <Link href={href}>
      <Card className="flex h-full flex-col items-center justify-center gap-2 px-3 py-5 text-center transition-colors hover:border-[var(--wz-primary)]">
        <Icon className="h-5 w-5 text-[var(--wz-primary)]" strokeWidth={2} />
        <span className="text-sm font-medium text-[var(--wz-text-primary)]">{label}</span>
      </Card>
    </Link>
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
