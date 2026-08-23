import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { decideEstimate } from "./actions";

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const estimateTotal = (items: { quantity: number; unit_price: number }[]) =>
  items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

export default async function ChamadoDetailPage({
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
  const { data: request } = await supabase
    .from("service_requests")
    .select("id, description, priority, status, requested_at, vehicles(brand, model), tenants(name)")
    .eq("id", id)
    .single();

  if (!request) {
    notFound();
  }

  const [{ data: diagnostic }, { data: estimates }] = await Promise.all([
    supabase.from("diagnostics").select("summary").eq("service_request_id", id).maybeSingle(),
    supabase
      .from("estimates")
      .select(
        "id, version, status, notes, created_at, estimate_items(description, kind, quantity, unit_price)",
      )
      .eq("service_request_id", id)
      .order("version", { ascending: false }),
  ]);

  const latestEstimate = estimates?.[0] ?? null;
  const olderVersions = estimates?.slice(1) ?? [];

  return (
    <div>
      <PageHeader
        title={`${request.vehicles?.brand ?? ""} ${request.vehicles?.model ?? ""}`}
        description={request.tenants?.name ?? ""}
      />

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-[var(--wz-text-primary)]">{request.description}</p>
            <StatusBadge status={request.status} />
          </div>
        </CardBody>
      </Card>

      {diagnostic && (
        <Card className="mb-6">
          <CardHeader>
            <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">
              Diagnóstico da oficina
            </h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-[var(--wz-text-secondary)]">{diagnostic.summary}</p>
          </CardBody>
        </Card>
      )}

      {latestEstimate && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">
                Orçamento (v{latestEstimate.version})
              </h2>
              <StatusBadge status={latestEstimate.status} />
            </div>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1 text-sm text-[var(--wz-text-secondary)]">
              {latestEstimate.estimate_items?.map((item, index) => (
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
            {latestEstimate.notes && (
              <p className="mt-2 text-xs text-[var(--wz-text-secondary)]">{latestEstimate.notes}</p>
            )}
            <p className="mt-2 text-right text-sm font-semibold text-[var(--wz-text-primary)]">
              Total: {currency(estimateTotal(latestEstimate.estimate_items ?? []))}
            </p>

            {latestEstimate.status === "SENT" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <form action={decideEstimate.bind(null, latestEstimate.id, "APPROVED")}>
                  <Button type="submit" size="sm">
                    Aprovar orçamento
                  </Button>
                </form>
                <form action={decideEstimate.bind(null, latestEstimate.id, "REJECTED")}>
                  <Button type="submit" variant="ghost" size="sm">
                    Recusar
                  </Button>
                </form>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {!latestEstimate && request.status === "ACCEPTED" && (
        <p className="text-sm text-[var(--wz-text-secondary)]">
          A oficina aceitou o chamado — o orçamento aparece aqui assim que for enviado.
        </p>
      )}

      {olderVersions.length > 0 && (
        <p className="text-xs text-[var(--wz-text-secondary)]">
          Versões anteriores deste orçamento: {olderVersions.map((e) => `v${e.version}`).join(", ")}.
        </p>
      )}
    </div>
  );
}
