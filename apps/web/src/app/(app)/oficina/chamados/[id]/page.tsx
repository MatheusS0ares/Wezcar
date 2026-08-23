import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createWorkOrderFromServiceRequest } from "../../actions";
import { DiagnosticForm } from "./diagnostic-form";
import { EstimateForm } from "./estimate-form";

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const estimateTotal = (items: { quantity: number; unit_price: number }[]) =>
  items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

export default async function OficinaChamadoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  const supabase = await createClient();

  // service_request.manage is distinct from work_order.update, same as /oficina/chamados.
  const { data: canManageRequests } = await supabase.rpc("has_permission", {
    permission_code: "service_request.manage",
  });

  if (!canManageRequests) {
    redirect("/painel");
  }

  const { data: request } = await supabase
    .from("service_requests")
    .select(
      "id, description, priority, status, requested_at, vehicles(brand, model, plate), users:customer_id(name)",
    )
    .eq("id", id)
    .single();

  if (!request) {
    notFound();
  }

  const [{ data: diagnostic }, { data: estimates }, { data: workOrder }, { data: products }] =
    await Promise.all([
      supabase
        .from("diagnostics")
        .select("summary, updated_at")
        .eq("service_request_id", id)
        .maybeSingle(),
      supabase
        .from("estimates")
        .select(
          "id, version, status, notes, created_at, estimate_items(description, kind, quantity, unit_price)",
        )
        .eq("service_request_id", id)
        .order("version", { ascending: false }),
      supabase.from("work_orders").select("id").eq("service_request_id", id).maybeSingle(),
      supabase.from("products").select("id, name, unit, unit_price, stock_on_hand").order("name"),
    ]);

  const latestEstimate = estimates?.[0] ?? null;
  const canCreateOrder = latestEstimate?.status === "APPROVED" && !workOrder;

  return (
    <div>
      <PageHeader
        title={`${request.vehicles?.brand ?? ""} ${request.vehicles?.model ?? ""}`}
        description={request.users?.name ?? ""}
      />

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--wz-text-primary)]">{request.description}</p>
              {request.vehicles?.plate && (
                <p className="mt-1 text-xs uppercase tracking-wide text-[var(--wz-text-secondary)]">
                  {request.vehicles.plate}
                </p>
              )}
            </div>
            <StatusBadge status={request.status} />
          </div>
        </CardBody>
      </Card>

      {request.status !== "ACCEPTED" ? (
        <p className="text-sm text-[var(--wz-text-secondary)]">
          Diagnóstico e orçamento ficam disponíveis depois que o chamado é aceito.
        </p>
      ) : (
        <>
          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">Diagnóstico</h2>
            </CardHeader>
            <CardBody>
              <DiagnosticForm serviceRequestId={id} initialSummary={diagnostic?.summary ?? ""} />
            </CardBody>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">Novo orçamento</h2>
            </CardHeader>
            <CardBody>
              <EstimateForm serviceRequestId={id} products={products ?? []} />
            </CardBody>
          </Card>

          {estimates && estimates.length > 0 && (
            <div className="mb-6 space-y-3">
              {estimates.map((estimate) => (
                <Card key={estimate.id}>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[var(--wz-text-primary)]">
                        Orçamento v{estimate.version}
                      </p>
                      <StatusBadge status={estimate.status} />
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-[var(--wz-text-secondary)]">
                      {estimate.estimate_items?.map((item, index) => (
                        <li key={index} className="flex justify-between gap-2">
                          <span>
                            {item.description}{" "}
                            <span className="text-xs">
                              ({item.kind === "PART" ? "peça" : "mão de obra"} × {item.quantity})
                            </span>
                          </span>
                          <span>{currency(item.quantity * item.unit_price)}</span>
                        </li>
                      ))}
                    </ul>
                    {estimate.notes && (
                      <p className="mt-2 text-xs text-[var(--wz-text-secondary)]">{estimate.notes}</p>
                    )}
                    <p className="mt-2 text-right text-sm font-semibold text-[var(--wz-text-primary)]">
                      Total: {currency(estimateTotal(estimate.estimate_items ?? []))}
                    </p>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}

          {workOrder ? (
            <p className="text-sm text-[var(--wz-text-secondary)]">OS já criada para este chamado.</p>
          ) : canCreateOrder ? (
            <form action={createWorkOrderFromServiceRequest.bind(null, id)}>
              <Button type="submit">Criar OS</Button>
            </form>
          ) : (
            <p className="text-sm text-[var(--wz-text-secondary)]">
              A OS só pode ser criada depois que o cliente aprovar um orçamento.
            </p>
          )}
        </>
      )}
    </div>
  );
}
