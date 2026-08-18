import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function OficinaPage() {
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

  const [{ data: requests }, { data: orders }] = await Promise.all([
    supabase.from("service_requests").select("status"),
    supabase.from("work_orders").select("status"),
  ]);

  const countBy = (rows: { status: string }[] | null, status: string) =>
    rows?.filter((r) => r.status === status).length ?? 0;

  const stats = [
    { label: "Chamados novos", value: countBy(requests, "OPEN") },
    { label: "Chamados aceitos", value: countBy(requests, "ACCEPTED") },
    { label: "OS em execução", value: countBy(orders, "IN_PROGRESS") },
    { label: "OS prontas", value: countBy(orders, "READY") },
  ];

  return (
    <div>
      <PageHeader title="Oficina" description="Visão operacional dos chamados e OS." />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
