import { Download } from "lucide-react";
import { SalesChart, TopProductsChart } from "@/components/admin/Charts";
import { Kpi, PageHeader, Panel, Table } from "@/components/admin/ui";
import { addDays, isoDay, limaDayStart, parseLimaDay } from "@/lib/admin-dates";
import { requireAdmin } from "@/lib/auth";
import { formatPEN } from "@/lib/format";

export const metadata = { title: "Reportes" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string; agrupar?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const today = limaDayStart();
  const from = parseLimaDay(sp.desde, addDays(today, -29));
  const toDay = parseLimaDay(sp.hasta, today);
  const to = addDays(toDay, 1);
  const bucket = sp.agrupar === "month" ? "month" : "day";

  const [summary, top, profit] = await Promise.all([
    supabase.rpc("admin_sales_summary", { p_from: from.toISOString(), p_to: to.toISOString(), p_bucket: bucket }),
    supabase.rpc("admin_top_products", { p_from: from.toISOString(), p_to: to.toISOString(), p_limit: 10 }),
    supabase.rpc("admin_profit_summary", { p_from: from.toISOString(), p_to: to.toISOString() }),
  ]);
  const rows = ((summary.data ?? []) as { period: string; orders: number; units: number; revenue: number }[]).map((r) => ({
    ...r,
    revenue: Number(r.revenue),
    orders: Number(r.orders),
    units: Number(r.units),
  }));
  const p = (profit.data?.[0] ?? {}) as { revenue?: number; cost?: number; profit?: number; orders?: number; units?: number; missing_cost_units?: number };
  const topRows = (top.data ?? []) as { product_name: string; units: number; revenue: number }[];
  const qs = new URLSearchParams({ desde: isoDay(from), hasta: isoDay(toDay), agrupar: bucket }).toString();
  const avg = Number(p.orders) ? Number(p.revenue) / Number(p.orders) : 0;

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle="Ventas por periodo (pedidos pagados, sin cancelados ni reembolsados)"
        actions={
          <>
            <a href={`/admin/reportes/exportar?${qs}&tipo=ventas`} className="btn btn-ghost"><Download className="h-4 w-4" /> Ventas CSV</a>
            <a href={`/admin/reportes/exportar?${qs}&tipo=pedidos`} className="btn btn-ghost"><Download className="h-4 w-4" /> Pedidos CSV</a>
            <a href={`/admin/reportes/exportar?${qs}&tipo=productos`} className="btn btn-ghost"><Download className="h-4 w-4" /> Productos CSV</a>
          </>
        }
      />
      <form className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <label><span className="label">Desde</span><input type="date" name="desde" defaultValue={isoDay(from)} className="input" /></label>
        <label><span className="label">Hasta</span><input type="date" name="hasta" defaultValue={isoDay(toDay)} className="input" /></label>
        <label>
          <span className="label">Agrupar por</span>
          <select name="agrupar" defaultValue={bucket} className="input">
            <option value="day">Día</option>
            <option value="month">Mes</option>
          </select>
        </label>
        <button className="btn btn-primary">Aplicar</button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi tone="electric" label="Ingresos" value={formatPEN(p.revenue ?? 0)} hint={`${p.units ?? 0} unidades`} />
        <Kpi tone="cyan" label="Ganancia estimada" value={formatPEN(p.profit ?? 0)} hint={`Costo: ${formatPEN(p.cost ?? 0)}`} />
        <Kpi tone="violet" label="Pedidos pagados" value={String(p.orders ?? 0)} />
        <Kpi tone="amber" label="Ticket promedio" value={formatPEN(avg)} hint={p.missing_cost_units ? `${p.missing_cost_units} uds. sin costo` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title={bucket === "month" ? "Ventas mensuales" : "Ventas diarias"}>
          <SalesChart data={rows.map((r) => ({ label: bucket === "month" ? r.period.slice(0, 7) : r.period.slice(5).split("-").reverse().join("/"), revenue: r.revenue, orders: r.orders }))} height={280} />
        </Panel>
        <Panel title="Productos más vendidos">
          <TopProductsChart data={topRows.map((t) => ({ name: t.product_name.length > 18 ? `${t.product_name.slice(0, 17)}…` : t.product_name, units: Number(t.units), revenue: Number(t.revenue) }))} height={280} />
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Detalle por periodo">
          <Table>
            <thead><tr><th>Periodo</th><th className="!text-right">Pedidos</th><th className="!text-right">Unidades</th><th className="!text-right">Ingresos</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.period}><td className="font-mono">{bucket === "month" ? r.period.slice(0, 7) : r.period}</td><td className="text-right">{r.orders}</td><td className="text-right">{r.units}</td><td className="text-right font-mono">{formatPEN(r.revenue)}</td></tr>
              ))}
              {!rows.length && <tr><td colSpan={4} className="py-6 text-center text-zinc-500">Sin ventas en el periodo</td></tr>}
            </tbody>
          </Table>
        </Panel>
        <Panel title="Ranking de productos">
          <Table>
            <thead><tr><th>#</th><th>Producto</th><th className="!text-right">Unidades</th><th className="!text-right">Ingresos</th></tr></thead>
            <tbody>
              {topRows.map((t, i) => (
                <tr key={t.product_name}><td>{i + 1}</td><td>{t.product_name}</td><td className="text-right">{t.units}</td><td className="text-right font-mono">{formatPEN(t.revenue)}</td></tr>
              ))}
              {!topRows.length && <tr><td colSpan={4} className="py-6 text-center text-zinc-500">Sin datos</td></tr>}
            </tbody>
          </Table>
        </Panel>
      </div>
    </>
  );
}
