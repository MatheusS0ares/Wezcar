import Link from "next/link";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getNavContext } from "@/lib/nav";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ProductForm } from "./product-form";
import { AdjustStockForm } from "./adjust-stock-form";

export default async function EstoquePage() {
  const ctx = await getNavContext();

  if (!ctx) {
    redirect("/entrar");
  }

  if (!ctx.isWorkshopStaff) {
    redirect("/painel");
  }

  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, sku, name, unit, unit_cost, unit_price, min_stock, stock_on_hand")
    .order("name");

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Catálogo de produtos e movimentações."
        action={
          <Link href="/oficina/estoque/compras" className="text-sm font-medium text-[var(--wz-primary)]">
            Compras →
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--wz-text-primary)]">Cadastrar produto</h2>
        </CardHeader>
        <CardBody>
          <ProductForm />
        </CardBody>
      </Card>

      <div className="space-y-3">
        {products?.length ? (
          products.map((product) => {
            const low = product.min_stock > 0 && product.stock_on_hand < product.min_stock;
            return (
              <Card key={product.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--wz-text-primary)]">{product.name}</p>
                      {product.sku && (
                        <p className="text-xs uppercase tracking-wide text-[var(--wz-text-secondary)]">
                          {product.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[var(--wz-text-primary)]">
                        {product.stock_on_hand} {product.unit}
                      </p>
                      {low && (
                        <Badge tone="warning">Abaixo do mínimo ({product.min_stock})</Badge>
                      )}
                    </div>
                  </div>
                  {product.unit_price != null && (
                    <p className="mt-1 text-xs text-[var(--wz-text-secondary)]">
                      Venda: {product.unit_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      {product.unit_cost != null &&
                        ` — Custo: ${product.unit_cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
                    </p>
                  )}
                  <AdjustStockForm productId={product.id} />
                </CardBody>
              </Card>
            );
          })
        ) : (
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado"
            description="Cadastre o primeiro produto acima para começar a controlar o estoque."
          />
        )}
      </div>
    </div>
  );
}
