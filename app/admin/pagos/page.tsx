import Link from "next/link";
import { Empty, Kpi, PageHeader, Panel, Table } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { PAYMENT_STATUS_LABEL, formatDate, formatPEN } from "@/lib/format";
import { mpConfigured, mpIsTestMode } from "@/lib/payments/mercadopago";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pagos" };

const TONE: Record<string, string> = {
  approved: "text-emerald-300",
  pending: "text-amber-300",
  in_process: "text-amber-300",
  rejected: "text-rose-300",
  cancelled: "text-zinc-400",
  refunded: "text-zinc-300",
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  let q = supabase
    .from("payments")
    .select("id, provider, provider_payment_id, provider_reference, status, status_detail, amount, is_test, created_at, order:orders(id, order_number, customer_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.estado && sp.estado in PAYMENT_STATUS_LABEL) q = q.eq("status", sp.estado);
  const { data } = await q;
  const rows = data ?? [];
  const approved = rows.filter((r) => r.status === "approved").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <PageHeader title="Pagos" subtitle="Transacciones registradas y referencias de la pasarela" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Aprobado (listado)" value={formatPEN(approved)} tone="cyan" />
        <Kpi label="Transacciones" value={String(rows.length)} tone="electric" />
        <Kpi label="Mercado Pago" value={mpConfigured() ? (mpIsTestMode() ? "Modo pruebas" : "Producción") : "No configurado"} tone={mpConfigured() ? "violet" : "amber"} />
      </div>
      <Panel>
        <form className="mb-4 flex gap-3">
          <select name="estado" defaultValue={sp.estado ?? ""} className="input !w-auto">
            <option value="">Todos</option>
            {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button className="btn btn-ghost">Filtrar</button>
        </form>
        {!rows.length ? (
          <Empty>Sin transacciones.</Empty>
        ) : (
          <Table>
            <thead>
              <tr><th>Fecha</th><th>Pedido</th><th>Proveedor</th><th>Referencia</th><th>Estado</th><th className="!text-right">Monto</th></tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const o = p.order as unknown as { id: string; order_number: string; customer_name: string } | null;
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap text-xs text-zinc-400">{formatDate(p.created_at, true)}</td>
                    <td>{o && <Link href={`/admin/pedidos/${o.id}`} className="font-mono text-cyan-200 hover:underline">{o.order_number}</Link>}<span className="block text-xs text-zinc-500">{o?.customer_name}</span></td>
                    <td>{p.provider}{p.is_test && <span className="ml-2 rounded bg-violet-500/20 px-1.5 text-[0.65rem] text-violet-200">PRUEBA</span>}</td>
                    <td className="font-mono text-xs">{p.provider_payment_id ?? "—"}{p.provider_reference && <span className="block text-zinc-500">{p.provider_reference}</span>}</td>
                    <td className={cn(TONE[p.status])}>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}{p.status_detail && <span className="block text-xs text-zinc-500">{p.status_detail}</span>}</td>
                    <td className="text-right font-mono">{formatPEN(p.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
