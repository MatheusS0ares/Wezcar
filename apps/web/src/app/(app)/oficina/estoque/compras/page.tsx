import { redirect } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "./supplier-form";
import { PurchaseForm } from "./purchase-form";
import { cancelPurchase, receivePurchase } from "./actions";

export default async function ComprasPage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  if (!ctx.isWorkshopStaff) {
    redirect("/painel");
  }

  const supabase = await createClient();
  const [{ data: suppliers }, { data: products }, { data: purchases }] = await Promise.all([
    supabase.from("suppliers").select("id, name").order("name"),
    supabase.from("products").select("id, name").order("name"),
    supabase
      .from("purchases")
      .select("id, status, notes, created_at, received_at, suppliers(name), purchase_items(quantity, unit_cost, products(name))")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <PageHeader title="Compras" description="Fornecedores e reposição de estoque." />

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">Fornecedores</h2>
        </CardHeader>
        <CardBody>
          <SupplierForm />
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">Nova compra</h2>
        </CardHeader>
        <CardBody>
          <PurchaseForm suppliers={suppliers ?? []} products={products ?? []} />
        </CardBody>
      </Card>

      <div className="space-y-3">
        {purchases?.length ? (
          purchases.map((purchase) => {
            const total = (purchase.purchase_items ?? []).reduce(
              (sum, item) => sum + item.quantity * item.unit_cost,
              0,
            );
            return (
              <Card key={purchase.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--wz-text-primary)]">
                      {purchase.suppliers?.name ?? "Sem fornecedor"}
                    </p>
                    <StatusBadge status={purchase.status} />
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--wz-text-secondary)]">
                    {purchase.purchase_items?.map((item, index) => (
                      <li key={index}>
                        {item.products?.name} × {item.quantity} —{" "}
                        {(item.quantity * item.unit_cost).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-right text-sm font-semibold text-[var(--wz-text-primary)]">
                    Total: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>

                  {(purchase.status === "DRAFT" || purchase.status === "ORDERED") && (
                    <div className="mt-3 flex gap-2">
                      <form action={receivePurchase.bind(null, purchase.id)}>
                        <Button type="submit" size="sm">
                          Marcar como recebida
                        </Button>
                      </form>
                      <form action={cancelPurchase.bind(null, purchase.id)}>
                        <Button type="submit" variant="ghost" size="sm">
                          Cancelar
                        </Button>
                      </form>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })
        ) : (
          <EmptyState icon={ShoppingCart} title="Nenhuma compra registrada ainda" />
        )}
      </div>
    </div>
  );
}
