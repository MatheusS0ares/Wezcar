import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Landmark, Package, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SlaSettingsForm } from "./sla-settings-form";

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function OficinaPage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  if (!ctx.isWorkshopStaff) {
    redirect("/painel");
  }

  const supabase = await createClient();
  const [
    { data: requests },
    { data: orders },
    { data: slaDefinition },
    { data: products },
    { data: receivables },
    { data: payables },
  ] = await Promise.all([
    supabase.from("service_requests").select("status"),
    supabase.from("work_orders").select("status, work_orders_sla_status"),
    ctx.profile?.tenant_id
      ? supabase
          .from("sla_definitions")
          .select("default_hours")
          .eq("tenant_id", ctx.profile.tenant_id)
          .maybeSingle()
      : { data: null },
    supabase.from("products").select("min_stock, stock_on_hand"),
    supabase.from("accounts_receivable").select("amount, paid_amount, status"),
    supabase.from("accounts_payable").select("amount, paid_amount, status"),
  ]);

  const countBy = (rows: { status: string }[] | null, status: string) =>
    rows?.filter((r) => r.status === status).length ?? 0;

  const countBySla = (status: string) =>
    orders?.filter((o) => o.work_orders_sla_status === status).length ?? 0;

  const lowStockCount =
    products?.filter((p) => p.min_stock > 0 && p.stock_on_hand < p.min_stock).length ?? 0;

  const openBalance = (rows: { amount: number; paid_amount: number; status: string }[] | null) =>
    rows?.filter((r) => r.status === "OPEN").reduce((sum, r) => sum + (r.amount - r.paid_amount), 0) ?? 0;

  const stats = [
    { label: "Chamados novos", value: countBy(requests, "OPEN") },
    { label: "Chamados aceitos", value: countBy(requests, "ACCEPTED") },
    { label: "OS em execução", value: countBy(orders, "IN_PROGRESS") },
    { label: "OS prontas", value: countBy(orders, "READY") },
    { label: "SLA em risco", value: countBySla("AT_RISK") },
    { label: "SLA estourado", value: countBySla("BREACHED") },
    { label: "Produtos abaixo do estoque mínimo", value: lowStockCount },
    { label: "A receber (aberto)", value: currency(openBalance(receivables)) },
    { label: "A pagar (aberto)", value: currency(openBalance(payables)) },
  ];

  return (
    <div>
      <PageHeader title="Oficina" description="Visão operacional dos chamados e OS." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardBody>
              <p className="text-2xl font-semibold text-[var(--wz-text-primary)]">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-[var(--wz-text-secondary)]">{stat.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/oficina/chamados">
          <Card className="flex items-center gap-3 px-4 py-5 transition-colors hover:border-[var(--wz-primary)]">
            <ClipboardList className="h-5 w-5 text-[var(--wz-primary)]" />
            <span className="font-medium text-[var(--wz-text-primary)]">Chamados</span>
          </Card>
        </Link>
        <Link href="/oficina/os">
          <Card className="flex items-center gap-3 px-4 py-5 transition-colors hover:border-[var(--wz-primary)]">
            <Wrench className="h-5 w-5 text-[var(--wz-primary)]" />
            <span className="font-medium text-[var(--wz-text-primary)]">Ordens de serviço</span>
          </Card>
        </Link>
        <Link href="/oficina/estoque">
          <Card className="flex items-center gap-3 px-4 py-5 transition-colors hover:border-[var(--wz-primary)]">
            <Package className="h-5 w-5 text-[var(--wz-primary)]" />
            <span className="font-medium text-[var(--wz-text-primary)]">Estoque</span>
          </Card>
        </Link>
        <Link href="/oficina/financeiro">
          <Card className="flex items-center gap-3 px-4 py-5 transition-colors hover:border-[var(--wz-primary)]">
            <Landmark className="h-5 w-5 text-[var(--wz-primary)]" />
            <span className="font-medium text-[var(--wz-text-primary)]">Financeiro</span>
          </Card>
        </Link>
      </div>

      {ctx.profile?.tenant_id && (
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">
              Prazo de entrega (SLA)
            </h2>
          </CardHeader>
          <CardBody>
            <SlaSettingsForm
              tenantId={ctx.profile.tenant_id}
              currentHours={slaDefinition?.default_hours ?? 48}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
