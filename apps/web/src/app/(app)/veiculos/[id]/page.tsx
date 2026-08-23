import { notFound, redirect } from "next/navigation";
import { History, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { MaintenanceForm } from "./maintenance-form";

const currency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function VeiculoDetailPage({
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
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, brand, model, plate, manufacture_year, mileage")
    .eq("id", id)
    .single();

  if (!vehicle) {
    notFound();
  }

  const [{ data: records }, { data: warranties }] = await Promise.all([
    supabase
      .from("maintenance_records")
      .select("id, source, description, mileage, cost, performed_at")
      .eq("vehicle_id", id)
      .order("performed_at", { ascending: false }),
    supabase
      .from("warranties")
      .select("id, description, expires_at, warranties_status")
      .eq("vehicle_id", id)
      .order("expires_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader
        title={`${vehicle.brand} ${vehicle.model}`}
        description={
          vehicle.mileage != null
            ? `${vehicle.mileage.toLocaleString("pt-BR")} km${vehicle.plate ? ` — ${vehicle.plate}` : ""}`
            : "Vida do carro"
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">
            Registrar manutenção feita fora da Wezcar
          </h2>
        </CardHeader>
        <CardBody>
          <MaintenanceForm vehicleId={id} />
        </CardBody>
      </Card>

      {warranties && warranties.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--wz-text-primary)]">
            <ShieldCheck className="h-4 w-4" /> Garantias
          </h2>
          <div className="space-y-3">
            {warranties.map((warranty) => (
              <Card key={warranty.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-[var(--wz-text-primary)]">{warranty.description}</p>
                    <StatusBadge status={warranty.warranties_status} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--wz-text-secondary)]">
                    Válida até {new Date(warranty.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--wz-text-primary)]">
        <History className="h-4 w-4" /> Histórico
      </h2>
      <div className="space-y-3">
        {records?.length ? (
          records.map((record) => (
            <Card key={record.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-[var(--wz-text-primary)]">{record.description}</p>
                  <span className="text-xs font-medium uppercase tracking-wide text-[var(--wz-text-secondary)]">
                    {record.source === "WORK_ORDER" ? "Wezcar" : "Manual"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[var(--wz-text-secondary)]">
                  {new Date(record.performed_at).toLocaleDateString("pt-BR")}
                  {record.mileage != null && ` — ${record.mileage.toLocaleString("pt-BR")} km`}
                  {record.cost != null && ` — ${currency(record.cost)}`}
                </p>
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={History}
            title="Nenhuma manutenção registrada ainda"
            description="O histórico aparece aqui conforme OS são entregues ou você registra manutenções feitas fora da Wezcar."
          />
        )}
      </div>
    </div>
  );
}
