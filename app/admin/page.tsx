import Link from "next/link";
import { SalesChart, TopProductsChart } from "@/components/admin/Charts";
import { Kpi, PageHeader, Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { addDays, isoDay, limaDayStart } from "@/lib/admin-dates";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatPEN } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const { supabase } = await requireAdmin();
  const today = limaDayStart();
  const from30 = addDays(today, -29);
  const tomorrow = addDays(today, 1);
  const epoch = new Date("2000-01-01T00:00:00Z");

  const [daily, top, profitAll, profit30, products, customers, ordersCount, recent, movements, inventory] = await Promise.all([
    supabase.rpc("admin_sales_summary", { p_from: from30.toISOString(), p_to: tomorrow.toISOString(), p_bucket: "day" }),
    supabase.rpc("admin_top_products", { p_from: epoch.toISOString(), p_to: tomorrow.toISOString(), p_limit: 6 }),
    supabase.rpc("admin_profit_summary", { p_from: epoch.toISOString(), p_to: tomorrow.toISOString() }),
    supabase.rpc("admin_profit_summary", { p_from: from30.toISOString(), p_to: tomorrow.toISOString() }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id, order_number, customer_name, status, total, created_at").order("created_at", { ascending: false }).limit(6),
    supabase
      .from("inventory_movements")
      .select("id, delta, reason, stock_after, created_at, variant:product_variants(sku, color_name, product:products(name))")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("inventory").select("stock, low_stock_threshold"),
  ]);

  type DayRow = { period: string; revenue: number; orders: number };
  const byDay = new Map<string, DayRow>(((daily.data ?? []) as DayRow[]).map((r) => [r.period, r]));
  const series = Array.from({ length: 30 }, (_, i) => {
    const d = isoDay(addDays(from30, i));
    const r = byDay.get(d);
    return { label: d.slice(5).split("-").reverse().join("/"), revenue: Number(r?.revenue ?? 0), orders: Number(r?.orders ?? 0) };
  });
  const pAll = (profitAll.data?.[0] ?? {}) as { revenue?: number; profit?: number; orders?: number; units?: number; missing_cost_units?: number };
  const p30 = (profit30.data?.[0] ?? {}) as { revenue?: number; profit?: number };
  const lowStock = (inventory.data ?? []).filter((i) => i.stock <= i.low_stock_threshold).length;

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen del negocio en tiempo real" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi tone="electric" label="Ventas totales" value={formatPEN(pAll.revenue ?? 0)} hint={`Últimos 30 días: ${formatPEN(p30.revenue ?? 0)}`} />
        <Kpi tone="cyan" label="Ganancias (estimadas)" value={formatPEN(pAll.profit ?? 0)} hint={pAll.missing_cost_units ? `${pAll.missing_cost_units} uds. sin costo registrado` : `30 días: ${formatPEN(p30.profit ?? 0)}`} />
        <Kpi tone="violet" label="Pedidos" value={String(ordersCount.count ?? 0)} hint={`${pAll.orders ?? 0} pagados · ${pAll.units ?? 0} unidades`} />
        <Kpi tone="amber" label="Productos · Clientes" value={`${products.count ?? 0} · ${customers.count ?? 0}`} hint={lowStock ? `${lowStock} variantes con stock bajo` : "Stock saludable"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Ingresos — últimos 30 días">
          <SalesChart data={series} />
        </Panel>
        <Panel title="Productos más vendidos" actions={<Link href="/admin/reportes" className="text-xs text-cyan-300">Reportes →</Link>}>
          <TopProductsChart
            data={(top.data ?? []).map((t: { product_name: string; units: number; revenue: number }) => ({
              name: t.product_name.length > 18 ? `${t.product_name.slice(0, 17)}…` : t.product_name,
              units: Number(t.units),
              revenue: Number(t.revenue),
            }))}
          />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Pedidos recientes" actions={<Link href="/admin/pedidos" className="text-xs text-cyan-300">Ver todos →</Link>}>
          {recent.data?.length ? (
            <ul className="divide-y divide-white/5">
              {recent.data.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/pedidos/${o.id}`} className="flex items-center gap-3 py-3 text-sm hover:text-cyan-200">
                    <span className="w-24 font-mono">{o.order_number}</span>
                    <span className="min-w-0 flex-1 truncate text-zinc-300">{o.customer_name}</span>
                    <StatusBadge status={o.status as OrderStatus} />
                    <span className="w-28 text-right font-mono">{formatPEN(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-zinc-500">Aún no hay pedidos.</p>
          )}
        </Panel>
        <Panel title="Actividad de inventario" actions={<Link href="/admin/inventario" className="text-xs text-cyan-300">Inventario →</Link>}>
          <ul className="divide-y divide-white/5">
            {(movements.data ?? []).map((m) => {
              const v = m.variant as unknown as { sku: string; color_name: string; product: { name: string } } | null;
              return (
                <li key={m.id} className="flex items-center gap-3 py-3 text-sm">
                  <span className={m.delta > 0 ? "w-12 font-mono text-emerald-300" : "w-12 font-mono text-rose-300"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
                  <span className="min-w-0 flex-1 truncate">{v?.product?.name} · {v?.color_name}</span>
                  <span className="text-xs text-zinc-500">{m.reason}</span>
                  <span className="w-32 text-right text-xs text-zinc-500">{formatDate(m.created_at, true)}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </>
  );
}
