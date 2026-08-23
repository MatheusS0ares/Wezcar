import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { acceptServiceRequest, rejectServiceRequest } from "../actions";

export default async function OficinaChamadosPage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  const supabase = await createClient();

  // service_request.manage is distinct from work_order.update, so this checks it directly
  // rather than reusing ctx.isWorkshopStaff.
  const { data: canManageRequests } = await supabase.rpc("has_permission", {
    permission_code: "service_request.manage",
  });

  if (!canManageRequests) {
    redirect("/painel");
  }

  const [{ data: requests }, { data: orders }] = await Promise.all([
    supabase
      .from("service_requests")
      .select("id, description, priority, status, requested_at, vehicles(brand, model), users:customer_id(name)")
      .order("requested_at", { ascending: false }),
    supabase.from("work_orders").select("service_request_id"),
  ]);

  const requestsWithWorkOrder = new Set(
    orders?.map((o) => o.service_request_id).filter(Boolean) ?? [],
  );

  return (
    <div>
      <PageHeader title="Chamados" description="Solicitações recebidas pela sua oficina." />

      <div className="space-y-3">
        {requests?.length ? (
          requests.map((request) => (
            <Card key={request.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--wz-text-primary)]">
                      {request.vehicles?.brand} {request.vehicles?.model} —{" "}
                      {request.users?.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--wz-text-secondary)]">
                      {request.description}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {request.status === "OPEN" && (
                    <>
                      <form action={acceptServiceRequest.bind(null, request.id)}>
                        <Button type="submit" size="sm">
                          Aceitar
                        </Button>
                      </form>
                      <form action={rejectServiceRequest.bind(null, request.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Recusar
                        </Button>
                      </form>
                    </>
                  )}
                  {request.status === "ACCEPTED" && !requestsWithWorkOrder.has(request.id) && (
                    <Link href={`/oficina/chamados/${request.id}`}>
                      <Button type="button" size="sm">
                        Diagnóstico e orçamento
                      </Button>
                    </Link>
                  )}
                  {request.status === "ACCEPTED" && requestsWithWorkOrder.has(request.id) && (
                    <span className="text-xs text-[var(--wz-text-secondary)]">
                      OS já criada
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState icon={ClipboardList} title="Nenhum chamado recebido ainda" />
        )}
      </div>
    </div>
  );
}
