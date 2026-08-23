import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AuditoriaPage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  if (!ctx.isPlatformAdmin) {
    redirect("/painel");
  }

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, table_name, record_id, before, after, created_at, tenants(name), users:actor_id(name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Auditoria"
        description="Últimas 100 operações críticas registradas (RN-AUD-001)."
      />

      {logs?.length ? (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={log.action} />
                    <span className="text-sm font-medium text-[var(--wz-text-primary)]">
                      {log.table_name}
                    </span>
                    {log.record_id && (
                      <span className="text-xs text-[var(--wz-text-secondary)]">
                        #{log.record_id.slice(0, 8)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[var(--wz-text-secondary)]">
                    {new Date(log.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>

                <p className="mt-1 text-xs text-[var(--wz-text-secondary)]">
                  {log.users?.name ?? "Sistema"}
                  {log.users?.email ? ` (${log.users.email})` : ""}
                  {log.tenants?.name ? ` — ${log.tenants.name}` : ""}
                </p>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-[var(--wz-primary)]">
                    Ver antes / depois
                  </summary>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <pre className="overflow-x-auto rounded-lg bg-[var(--wz-background)] p-2 text-xs text-[var(--wz-text-secondary)]">
                      {log.before ? JSON.stringify(log.before, null, 2) : "—"}
                    </pre>
                    <pre className="overflow-x-auto rounded-lg bg-[var(--wz-background)] p-2 text-xs text-[var(--wz-text-secondary)]">
                      {log.after ? JSON.stringify(log.after, null, 2) : "—"}
                    </pre>
                  </div>
                </details>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={ScrollText} title="Nenhum evento de auditoria ainda" />
      )}
    </div>
  );
}
