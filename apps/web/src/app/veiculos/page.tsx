import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddVehicleForm, MileageForm } from "./vehicle-forms";

export default async function VeiculosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/entrar");
  }

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, brand, model, plate, manufacture_year, mileage, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--wz-text-primary)]">Meus veículos</h1>
        <Link
          href="/painel"
          className="text-sm font-medium text-[var(--wz-text-secondary)] hover:text-[var(--wz-primary)]"
        >
          ← Painel
        </Link>
      </div>

      <div className="mb-8 rounded-xl border border-[var(--wz-border)] bg-[var(--wz-surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--wz-text-primary)]">
          Cadastrar veículo
        </h2>
        <AddVehicleForm />
      </div>

      <div className="space-y-3">
        {vehicles?.length ? (
          vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="rounded-xl border border-[var(--wz-border)] bg-[var(--wz-surface)] p-4"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-medium text-[var(--wz-text-primary)]">
                  {vehicle.brand} {vehicle.model}
                  {vehicle.manufacture_year ? ` (${vehicle.manufacture_year})` : ""}
                </h3>
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
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--wz-text-secondary)]">
            Nenhum veículo cadastrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
