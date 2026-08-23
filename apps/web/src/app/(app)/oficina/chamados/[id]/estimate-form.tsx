"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { createEstimate } from "./actions";

type Product = { id: string; name: string; unit: string; unit_price: number | null; stock_on_hand: number };

let nextRowKey = 1;

function ItemRow({
  products,
  showRemove,
  onRemove,
}: {
  products: Product[];
  showRemove: boolean;
  onRemove: () => void;
}) {
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const handleProductChange = (id: string) => {
    setProductId(id);
    const product = products.find((p) => p.id === id);
    if (product) {
      setDescription(product.name);
      if (product.unit_price != null) setUnitPrice(String(product.unit_price));
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-[var(--wz-border)] p-3">
      {products.length > 0 && (
        <Select value={productId} onChange={(e) => handleProductChange(e.target.value)}>
          <option value="">Peça do estoque (opcional)</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} — {product.stock_on_hand} {product.unit} em estoque
            </option>
          ))}
        </Select>
      )}
      <input type="hidden" name="productId" value={productId} />

      <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_120px_90px_130px_auto]">
        <Input
          name="description"
          placeholder="Descrição (ex. Pastilha de freio dianteira)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="col-span-2 sm:col-span-1"
        />
        <Select name="kind" defaultValue="PART">
          <option value="PART">Peça</option>
          <option value="LABOR">Mão de obra</option>
        </Select>
        <Input name="quantity" type="number" step="0.01" min="0.01" defaultValue="1" required />
        <Input
          name="unitPrice"
          type="number"
          step="0.01"
          min="0"
          placeholder="Valor un. (R$)"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          required
        />
        {showRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="justify-self-start text-xs text-[var(--wz-text-secondary)] hover:text-[var(--wz-danger)] sm:justify-self-center"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

export function EstimateForm({
  serviceRequestId,
  products = [],
}: {
  serviceRequestId: string;
  products?: Product[];
}) {
  const [state, formAction, pending] = useActionState(createEstimate, null);
  const [rowKeys, setRowKeys] = useState<number[]>([0]);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="serviceRequestId" value={serviceRequestId} />

      <div className="space-y-2">
        {rowKeys.map((key) => (
          <ItemRow
            key={key}
            products={products}
            showRemove={rowKeys.length > 1}
            onRemove={() => setRowKeys((keys) => keys.filter((k) => k !== key))}
          />
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setRowKeys((keys) => [...keys, nextRowKey++])}
      >
        + Adicionar item
      </Button>

      <Textarea name="notes" placeholder="Observação para o cliente (opcional)" rows={2} />

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar orçamento"}
      </Button>

      {state?.error && (
        <p className="text-sm text-[var(--wz-danger)]" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-[var(--wz-success)]" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
