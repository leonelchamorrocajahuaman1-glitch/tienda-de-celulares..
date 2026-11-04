import { FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderAdminActions } from "@/components/admin/OrderAdminActions";
import { PageHeader, Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, SHIPPING_METHOD_LABEL, formatDate, formatPEN } from "@/lib/format";
import type { OrderStatus, PaymentMethod, ShippingMethod } from "@/lib/types";

export const metadata = { title: "Pedido" };

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: o }, { data: notes }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(*), order_status_history(status, note, created_at), payments(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("order_internal_notes").select("notes").eq("order_id", id).maybeSingle(),
  ]);
  if (!o) notFound();
  const items = o.order_items as { id: string; product_name: string; variant_label: string; sku: string; unit_price: number; quantity: number; line_total: number }[];
  const history = (o.order_status_history as { status: OrderStatus; note: string | null; created_at: string }[]).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const payments = o.payments as { id: string; provider: string; status: string; status_detail: string | null; amount: number; provider_payment_id: string | null; provider_reference: string | null; is_test: boolean; created_at: string }[];
  const addr = o.shipping_address as Record<string, string> | null;

  return (
    <>
      <Link href="/admin/pedidos" className="text-sm text-zinc-400 hover:text-white">← Pedidos</Link>
      <PageHeader
        title={`Pedido ${o.order_number}`}
        subtitle={formatDate(o.created_at, true)}
        actions={
          <>
            <StatusBadge status={o.status as OrderStatus} />
            {o.receipt_number && (
              <Link href={`/comprobante/${o.id}`} target="_blank" className="btn btn-ghost !py-2">
                <FileText className="h-4 w-4" /> {o.receipt_number}
              </Link>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Productos">
            <ul className="divide-y divide-white/5 text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 py-3">
                  <div className="flex-1">
                    <p className="font-medium">{i.product_name}</p>
                    <p className="text-xs text-zinc-400">{i.variant_label} · <span className="font-mono">{i.sku}</span></p>
                  </div>
                  <span className="text-zinc-400">{i.quantity} × {formatPEN(i.unit_price)}</span>
                  <span className="w-28 text-right font-mono">{formatPEN(i.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-zinc-400">Subtotal</dt><dd className="font-mono">{formatPEN(o.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-400">Descuento {o.coupon_code && `(${o.coupon_code})`}</dt><dd className="font-mono">−{formatPEN(o.discount)}</dd></div>
              <div className="flex justify-between"><dt className="text-zinc-400">Envío</dt><dd className="font-mono">{formatPEN(o.shipping_cost)}</dd></div>
              <div className="flex justify-between text-base"><dt>Total</dt><dd className="font-display font-semibold">{formatPEN(o.total)}</dd></div>
            </dl>
          </Panel>
          <Panel title="Pagos y transacciones">
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="rounded-xl border border-white/10 p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>{p.provider} · <strong>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</strong>{p.is_test && <span className="ml-2 rounded bg-violet-500/20 px-1.5 text-[0.65rem] text-violet-200">PRUEBA</span>}</span>
                    <span className="font-mono">{formatPEN(p.amount)}</span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {p.provider_payment_id && <>ID: <span className="font-mono">{p.provider_payment_id}</span> · </>}
                    {p.provider_reference && <>Ref.: {p.provider_reference} · </>}
                    {p.status_detail && <>{p.status_detail} · </>}
                    {formatDate(p.created_at, true)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Historial">
            <ol className="space-y-3 border-l border-white/10 pl-5 text-sm">
              {history.map((h, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <p className="font-medium">{ORDER_STATUS_LABEL[h.status]}</p>
                  <p className="text-xs text-zinc-500">{formatDate(h.created_at, true)}{h.note && ` · ${h.note}`}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="space-y-6">
          <Panel title="Gestión">
            <OrderAdminActions
              orderId={o.id}
              status={o.status as OrderStatus}
              paymentMethod={o.payment_method}
              paid={Boolean(o.paid_at)}
              tracking={o.tracking_code}
              adminNotes={notes?.notes ?? null}
            />
          </Panel>
          <Panel title="Cliente">
            <div className="space-y-1 text-sm">
              <p className="font-medium">{o.customer_name}</p>
              <p className="text-zinc-400">{o.customer_email}</p>
              {o.customer_phone && <p className="text-zinc-400">{o.customer_phone}</p>}
              {o.document_number && <p className="text-zinc-400">{o.document_type}: {o.document_number}</p>}
              <p className="text-zinc-400">Comprobante: {o.receipt_type}</p>
            </div>
          </Panel>
          <Panel title="Entrega">
            <div className="space-y-1 text-sm">
              <p>{SHIPPING_METHOD_LABEL[o.shipping_method as ShippingMethod]}</p>
              {addr && (
                <p className="text-zinc-400">
                  {addr.recipient} · {addr.phone}<br />{addr.line1}, {addr.district}, {addr.province} — {addr.department}
                  {addr.reference && <><br />Ref.: {addr.reference}</>}
                </p>
              )}
              {o.tracking_code && <p>Seguimiento: <span className="font-mono">{o.tracking_code}</span></p>}
              <p className="pt-2 text-zinc-400">Pago: {PAYMENT_METHOD_LABEL[o.payment_method as PaymentMethod]}</p>
              {o.notes && <p className="pt-2 text-zinc-300">Nota del cliente: {o.notes}</p>}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
