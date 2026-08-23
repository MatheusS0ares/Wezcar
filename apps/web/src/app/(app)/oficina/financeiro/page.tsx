import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentForm } from "./payment-form";
import { registerPayablePayment, registerReceivablePayment } from "./actions";

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function FinanceiroPage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  if (!ctx.isWorkshopStaff) {
    redirect("/painel");
  }

  const supabase = await createClient();
  const [{ data: receivables }, { data: payables }] = await Promise.all([
    supabase
      .from("accounts_receivable")
      .select("id, amount, paid_amount, status, created_at, work_orders(vehicles(brand, model), users:customer_id(name))")
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts_payable")
      .select("id, amount, paid_amount, status, created_at, suppliers(name)")
      .order("created_at", { ascending: false }),
  ]);

  const openReceivable = (receivables ?? [])
    .filter((r) => r.status === "OPEN")
    .reduce((sum, r) => sum + (r.amount - r.paid_amount), 0);
  const openPayable = (payables ?? [])
    .filter((p) => p.status === "OPEN")
    .reduce((sum, p) => sum + (p.amount - p.paid_amount), 0);

  return (
    <div>
      <PageHeader title="Financeiro" description="Contas a receber e a pagar." />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card>
          <CardBody>
            <p className="text-2xl font-semibold text-[var(--wz-text-primary)]">
              {currency(openReceivable)}
            </p>
            <p className="mt-1 text-xs text-[var(--wz-text-secondary)]">A receber (em aberto)</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-2xl font-semibold text-[var(--wz-text-primary)]">
              {currency(openPayable)}
            </p>
            <p className="mt-1 text-xs text-[var(--wz-text-secondary)]">A pagar (em aberto)</p>
          </CardBody>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-[var(--wz-text-primary)]">A receber</h2>
      <div className="mb-6 space-y-3">
        {receivables?.length ? (
          receivables.map((account) => (
            <Card key={account.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-[var(--wz-text-primary)]">
                    {account.work_orders?.vehicles?.brand} {account.work_orders?.vehicles?.model} —{" "}
                    {account.work_orders?.users?.name}
                  </p>
                  <StatusBadge status={account.status} />
                </div>
                <p className="mt-1 text-sm text-[var(--wz-text-secondary)]">
                  {currency(account.paid_amount)} de {currency(account.amount)} pago
                </p>
                {account.status === "OPEN" && (
                  <PaymentForm
                    accountId={account.id}
                    idempotencyKey={randomUUID()}
                    action={registerReceivablePayment}
                  />
                )}
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState icon={Landmark} title="Nenhuma conta a receber ainda" />
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-[var(--wz-text-primary)]">A pagar</h2>
      <div className="space-y-3">
        {payables?.length ? (
          payables.map((account) => (
            <Card key={account.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-[var(--wz-text-primary)]">
                    {account.suppliers?.name ?? "Sem fornecedor"}
                  </p>
                  <StatusBadge status={account.status} />
                </div>
                <p className="mt-1 text-sm text-[var(--wz-text-secondary)]">
                  {currency(account.paid_amount)} de {currency(account.amount)} pago
                </p>
                {account.status === "OPEN" && (
                  <PaymentForm
                    accountId={account.id}
                    idempotencyKey={randomUUID()}
                    action={registerPayablePayment}
                  />
                )}
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState icon={Landmark} title="Nenhuma conta a pagar ainda" />
        )}
      </div>
    </div>
  );
}
