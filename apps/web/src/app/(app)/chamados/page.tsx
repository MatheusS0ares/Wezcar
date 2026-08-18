import { redirect } from "next/navigation";
import { Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ServiceRequestForm } from "./service-request-form";
import { cancelServiceRequest } from "./actions";

export default async function ChamadosPage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  const supabase = await createClient();
  const [{ data: vehicles }, { data: tenants }, { data: requests }] = await Promise.all([
    supabase.from("vehicles").select("id, brand, model").order("created_at", { ascending: false }),
    supabase.from("tenants").select("id, name").order("name"),
    supabase
      .from("service_requests")
      .select("id, description, priority, status, requested_at, vehicles(brand, model), tenants(name)")
      .order("requested_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader title="Chamados" description="Abra e acompanhe solicitações de serviço." />

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">Abrir chamado</h2>
        </CardHeader>
        <CardBody>
          <ServiceRequestForm vehicles={vehicles ?? []} tenants={tenants ?? []} />
        </CardBody>
      </Card>

      <div className="space-y-3">
        {requests?.length ? (
          requests.map((request) => (
            <Card key={request.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--wz-text-primary)]">
                      {request.vehicles?.brand} {request.vehicles?.model} — {request.tenants?.name}
                    </p>
                    <p className="mt-1 text-sm text-[var(--wz-text-secondary)]">
                      {request.description}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-[var(--wz-text-secondary)]">
                    Aberto em {new Date(request.requested_at).toLocaleString("pt-BR")}
                  </p>
                  {request.status === "OPEN" && (
                    <form action={cancelServiceRequest.bind(null, request.id)}>
                      <Button type="submit" variant="ghost" size="sm">
                        Cancelar
                      </Button>
                    </form>
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Wrench}
            title="Nenhum chamado ainda"
            description="Abra um chamado acima quando precisar de um serviço."
          />
        )}
      </div>
    </div>
  );
}
