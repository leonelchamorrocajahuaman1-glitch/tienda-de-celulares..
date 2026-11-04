import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireUser } from "@/lib/auth";
import { formatDate, formatPEN } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Mis pedidos" };

export default async function OrdersPage() {
  const { supabase } = await requireUser("/cuenta/pedidos");
  // RLS garantiza que solo se devuelven los pedidos del usuario autenticado
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at, receipt_number, order_items(quantity, product_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!orders?.length)
    return (
      <div className="card px-6 py-16 text-center">
        <p className="font-display text-xl">Todavía no tienes pedidos.</p>
        <Link href="/catalogo" className="btn btn-primary mt-6">Explorar colección</Link>
      </div>
    );
  return (
    <ul className="space-y-3">
      {orders.map((o) => {
        const items = o.order_items as { quantity: number; product_name: string }[];
        return (
          <li key={o.id}>
            <Link href={`/cuenta/pedidos/${o.id}`} className="card flex flex-wrap items-center gap-4 p-5 transition hover:border-white/20">
              <div className="min-w-40 flex-1">
                <p className="font-mono text-sm">{o.order_number}</p>
                <p className="text-xs text-zinc-500">{formatDate(o.created_at, true)}</p>
              </div>
              <p className="min-w-0 flex-[2] truncate text-sm text-zinc-300">
                {items.map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
              </p>
              <StatusBadge status={o.status as OrderStatus} />
              <p className="w-28 text-right font-mono">{formatPEN(o.total)}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
