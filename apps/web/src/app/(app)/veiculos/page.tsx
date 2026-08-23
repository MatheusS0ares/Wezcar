import { Car } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AddVehicleForm, MileageForm } from "./vehicle-forms";

export default async function VeiculosPage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  const supabase = await createClient();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, brand, model, plate, manufacture_year, mileage, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Meus veículos" description="Cadastre e acompanhe a quilometragem." />

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">
            Cadastrar veículo
          </h2>
        </CardHeader>
        <CardBody>
          <AddVehicleForm />
        </CardBody>
      </Card>

      <div className="space-y-3">
        {vehicles?.length ? (
          vehicles.map((vehicle) => (
            <Card key={vehicle.id}>
              <CardBody>
                <div className="flex items-baseline justify-between">
                  <Link
                    href={`/veiculos/${vehicle.id}`}
                    className="font-medium text-[var(--wz-text-primary)] hover:text-[var(--wz-primary)]"
                  >
                    {vehicle.brand} {vehicle.model}
                    {vehicle.manufacture_year ? ` (${vehicle.manufacture_year})` : ""}
                  </Link>
                  {vehicle.plate && (
                    <span className="text-xs uppercase tracking-wide text-[var(--wz-text-secondary)]">
                      {vehicle.plate}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[var(--wz-text-secondary)]">
                  {vehicle.mileage != null
                    ? `${vehicle.mileage.toLocaleString("pt-BR")} km`
                    : "Quilometragem não informada"}
                </p>
                <MileageForm vehicleId={vehicle.id} currentMileage={vehicle.mileage} />
                <Link
                  href={`/veiculos/${vehicle.id}`}
                  className="mt-2 inline-block text-xs font-medium text-[var(--wz-primary)] hover:underline"
                >
                  Ver histórico e garantias
                </Link>
              </CardBody>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Car}
            title="Nenhum veículo cadastrado"
            description="Cadastre seu primeiro veículo acima para começar a acompanhar a vida do carro."
          />
        )}
      </div>
    </div>
  );
}
