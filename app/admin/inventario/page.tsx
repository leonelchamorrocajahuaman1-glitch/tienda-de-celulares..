import { type InvRow, InventoryTable } from "@/components/admin/InventoryTable";
import { PageHeader, Panel, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Inventario" };

const REASON: Record<string, string> = {
  initial: "Inicial",
  restock: "Reposición",
  adjustment: "Ajuste",
  sale: "Venta",
  return: "Devolución",
  cancellation: "Cancelación",
};

export default async function InventoryPage() {
  const { supabase } = await requireAdmin();
  const [{ data: variants }, { data: movements }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, sku, color_name, color_hex, ram_gb, storage_gb, is_active, product:products(name), inventory(stock, low_stock_threshold)")
      .order("sku"),
    supabase
      .from("inventory_movements")
      .select("id, delta, stock_after, reason, note, created_at, variant:product_variants(sku, product:products(name)), order_id")
      .order("created_at", { ascending: false })
      .limit(150),
  ]);
  const rows: InvRow[] = (variants ?? []).map((v) => {
    const inv = (Array.isArray(v.inventory) ? v.inventory[0] : v.inventory) as { stock: number; low_stock_threshold: number } | null;
    return {
      variant_id: v.id,
      product: (v.product as unknown as { name: string } | null)?.name ?? "",
      sku: v.sku,
      color_name: v.color_name,
      color_hex: v.color_hex,
      ram_gb: v.ram_gb,
      storage_gb: v.storage_gb,
      stock: inv?.stock ?? 0,
      threshold: inv?.low_stock_threshold ?? 5,
      active: v.is_active,
    };
  });
  rows.sort((a, b) => a.product.localeCompare(b.product) || a.sku.localeCompare(b.sku));
  const units = rows.reduce((s, r) => s + r.stock, 0);

  return (
    <>
      <PageHeader title="Inventario" subtitle={`${rows.length} variantes · ${units} unidades en stock`} />
      <Panel>
        <InventoryTable rows={rows} />
      </Panel>
      <Panel title="Historial de movimientos (últimos 150)" className="mt-6">
        <Table>
          <thead>
            <tr><th>Fecha</th><th>Producto / SKU</th><th>Motivo</th><th className="!text-right">Cantidad</th><th className="!text-right">Stock final</th><th>Nota</th></tr>
          </thead>
          <tbody>
            {(movements ?? []).map((m) => {
              const v = m.variant as unknown as { sku: string; product: { name: string } } | null;
              return (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-xs text-zinc-400">{formatDate(m.created_at, true)}</td>
                  <td>{v?.product?.name}<span className="block font-mono text-xs text-zinc-500">{v?.sku}</span></td>
                  <td>{REASON[m.reason] ?? m.reason}</td>
                  <td className={m.delta > 0 ? "text-right font-mono text-emerald-300" : "text-right font-mono text-rose-300"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                  <td className="text-right font-mono">{m.stock_after}</td>
                  <td className="text-xs text-zinc-400">{m.note}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
