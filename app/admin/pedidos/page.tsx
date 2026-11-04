import Link from "next/link";
import { Empty, PageHeader, Panel, Table } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, formatDate, formatPEN } from "@/lib/format";
import type { OrderStatus, PaymentMethod } from "@/lib/types";

export const metadata = { title: "Pedidos" };

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const page = Math.max(1, Number(sp.page) || 1);
  const size = 30;
  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, customer_email, status, total, payment_method, shipping_method, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * size, page * size - 1);
  if (sp.estado && STATUSES.includes(sp.estado as OrderStatus)) query = query.eq("status", sp.estado);
  const q = sp.q?.trim().replace(/[%,()]/g, "");
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%`);
  const { data: orders, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / size));
  const qs = (p: number) => `?${new URLSearchParams({ ...(sp.estado ? { estado: sp.estado } : {}), ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <>
      <PageHeader title="Pedidos" subtitle={`${count ?? 0} pedidos`} />
      <Panel>
        <form className="mb-4 flex flex-wrap gap-3">
          <input name="q" defaultValue={sp.q} placeholder="N.° de pedido, cliente o correo" className="input max-w-sm" />
          <select name="estado" defaultValue={sp.estado ?? ""} className="input !w-auto">
            <option value="">Todos los estados</option>
            {STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
          </select>
          <button className="btn btn-ghost">Filtrar</button>
        </form>
        {!orders?.length ? (
          <Empty>No hay pedidos con esos filtros.</Empty>
        ) : (
          <Table>
            <thead>
              <tr><th>Pedido</th><th>Fecha</th><th>Cliente</th><th>Pago</th><th>Estado</th><th className="!text-right">Total</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/pedidos/${o.id}`} className="font-mono text-cyan-200 hover:underline">{o.order_number}</Link></td>
                  <td className="whitespace-nowrap text-xs text-zinc-400">{formatDate(o.created_at, true)}</td>
                  <td>{o.customer_name}<span className="block text-xs text-zinc-500">{o.customer_email}</span></td>
                  <td className="text-xs">{PAYMENT_METHOD_LABEL[o.payment_method as PaymentMethod]}</td>
                  <td><StatusBadge status={o.status as OrderStatus} /></td>
                  <td className="text-right font-mono">{formatPEN(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-sm">
            {page > 1 && <Link className="btn btn-ghost !py-1.5" href={qs(page - 1)}>Anterior</Link>}
            <span className="text-zinc-400">Página {page} de {pages}</span>
            {page < pages && <Link className="btn btn-ghost !py-1.5" href={qs(page + 1)}>Siguiente</Link>}
          </div>
        )}
      </Panel>
    </>
  );
}
