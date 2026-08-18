import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { advanceWorkOrder, cancelWorkOrder } from "../actions";

const NEXT_LABEL: Record<string, string> = {
  OPEN: "Iniciar execução",
  IN_PROGRESS: "Marcar como pronto",
  READY: "Marcar como entregue",
};

export default async function OficinaOsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: isWorkshopStaff } = await supabase.rpc("has_permission", {
    permission_code: "work_order.update",
  });

  if (!isWorkshopStaff) {
    redirect("/painel");
  }

  const { data: orders } = await supabase
    .from("work_orders")
    .select(
      "id, status, opened_at, completed_at, vehicles(brand, model), users:customer_id(name), work_order_events(event_type, old_status, new_status, created_at)",
    )
    .order("opened_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Ordens de serviço" description="OS abertas pela sua oficina." />

      <div className="space-y-3">
        {orders?.length ? (
          orders.map((order) => {
            const events = [...(order.work_order_events ?? [])].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            );
            const nextLabel = NEXT_LABEL[order.status];

            return (
              <Card key={order.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--wz-text-primary)]">
                        {order.vehicles?.brand} {order.vehicles?.model} — {order.users?.name}
                      </p>
                      <p className="mt-1 text-xs text-[var(--wz-text-secondary)]">
                        Aberta em {new Date(order.opened_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <ol className="mt-3 space-y-1 border-l border-[var(--wz-border)] pl-3">
                    {events.map((event, index) => (
                      <li key={index} className="text-xs text-[var(--wz-text-secondary)]">
                        {event.new_status ?? event.event_type} —{" "}
                        {new Date(event.created_at).toLocaleString("pt-BR")}
                      </li>
                    ))}
                  </ol>

                  {(nextLabel || order.status !== "DELIVERED") && order.status !== "CANCELED" && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {nextLabel && (
                        <form action={advanceWorkOrder.bind(null, order.id, order.status)}>
                          <Button type="submit" size="sm">
                            {nextLabel}
                          </Button>
                        </form>
                      )}
                      {order.status !== "DELIVERED" && (
                        <form action={cancelWorkOrder.bind(null, order.id)}>
                          <Button type="submit" variant="ghost" size="sm">
                            Cancelar OS
                          </Button>
                        </form>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={Wrench} title="Nenhuma OS aberta ainda" />
        )}
      </div>
    </div>
  );
}
