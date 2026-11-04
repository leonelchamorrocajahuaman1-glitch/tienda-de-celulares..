import { Check, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/account/OrderActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireUser } from "@/lib/auth";
import { getStoreSettings } from "@/lib/data/catalog";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  SHIPPING_METHOD_LABEL,
  formatDate,
  formatPEN,
} from "@/lib/format";
import { mpConfigured } from "@/lib/payments/mercadopago";
import type { OrderStatus, PaymentMethod, ShippingMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Detalle del pedido" };

const FLOW: OrderStatus[] = ["pending_payment", "paid", "processing", "shipped", "delivered"];

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string; pago?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireUser(`/cuenta/pedidos/${id}`);
  const [{ data: order }, settings] = await Promise.all([
    supabase
      .from("orders")
      .select("*, order_items(*), order_status_history(status, note, created_at), payments(provider, status, status_detail, amount, provider_payment_id, created_at)")
      .eq("id", id)
      .maybeSingle(),
    getStoreSettings(),
  ]);
  if (!order) notFound();

  const status = order.status as OrderStatus;
  const items = order.order_items as { id: string; product_name: string; variant_label: string; image_url: string | null; unit_price: number; quantity: number; line_total: number }[];
  const history = (order.order_status_history as { status: OrderStatus; note: string | null; created_at: string }[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const payments = order.payments as { provider: string; status: string; status_detail: string | null; amount: number; provider_payment_id: string | null; created_at: string }[];
  const addr = order.shipping_address as Record<string, string> | null;
  const stepIdx = FLOW.indexOf(status);

  return (
    <div className="space-y-6">
      {sp.nuevo && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <strong>¡Pedido registrado!</strong>{" "}
          {order.payment_method === "bank_transfer"
            ? "Realiza la transferencia con los datos indicados abajo. Confirmaremos tu pedido al validar el pago."
            : order.payment_method === "cash_on_pickup"
              ? "Te esperamos en tienda para el pago y la entrega."
              : "Te notificaremos cuando se confirme el pago."}
        </div>
      )}
      {sp.pago === "error" && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          No pudimos iniciar el pago con Mercado Pago. Puedes reintentarlo con el botón “Pagar ahora”.
        </p>
      )}

      <section className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-lg">{order.order_number}</p>
            <p className="text-sm text-zinc-400">{formatDate(order.created_at, true)}</p>
          </div>
          <StatusBadge status={status} />
        </div>

        {stepIdx >= 0 && (
          <ol className="mt-8 grid grid-cols-5 gap-2" aria-label="Seguimiento del pedido">
            {FLOW.map((s, i) => (
              <li key={s} className="flex flex-col items-center gap-2 text-center">
                <span className={cn("grid h-8 w-8 place-items-center rounded-full ring-1", i <= stepIdx ? "bg-gradient-to-br from-electric to-cyan-500 ring-transparent" : "ring-white/15 text-zinc-600")}>
                  {i <= stepIdx ? <Check className="h-4 w-4" /> : <span className="text-xs">{i + 1}</span>}
                </span>
                <span className={cn("text-[0.68rem] leading-tight", i <= stepIdx ? "text-zinc-200" : "text-zinc-500")}>{ORDER_STATUS_LABEL[s]}</span>
              </li>
            ))}
          </ol>
        )}
        {order.tracking_code && (
          <p className="mt-6 text-sm">Código de seguimiento: <span className="font-mono text-cyan-200">{order.tracking_code}</span></p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {order.receipt_number && (
            <Link href={`/comprobante/${order.id}`} className="btn btn-ghost" target="_blank">
              <FileText className="h-4 w-4" /> Comprobante {order.receipt_number}
            </Link>
          )}
          <OrderActions
            orderId={order.id}
            canPay={status === "pending_payment" && order.payment_method === "mercadopago" && mpConfigured()}
            canCancel={status === "pending_payment"}
          />
        </div>
      </section>

      {status === "pending_payment" && order.payment_method === "bank_transfer" && (
        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Datos para transferencia</h2>
          <p className="mt-2 whitespace-pre-line text-sm text-zinc-300">
            {settings.bank_details || "La tienda publicará aquí sus cuentas bancarias. Contáctanos para recibir los datos."}
          </p>
          <p className="mt-3 text-sm text-zinc-400">
            Monto exacto: <span className="font-mono text-white">{formatPEN(order.total)}</span> · Indica el código <span className="font-mono text-white">{order.order_number}</span> en la operación y envía la constancia a {settings.email}.
          </p>
        </section>
      )}

      <section className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Productos</h2>
        <ul className="divide-y divide-white/5">
          {items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 py-3">
              <div className="relative h-16 w-14 shrink-0 rounded-xl bg-white/[0.04]">
                {i.image_url && <Image src={i.image_url} alt="" fill sizes="56px" className="object-contain p-1" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{i.product_name}</p>
                <p className="text-xs text-zinc-400">{i.variant_label} · {i.quantity} × {formatPEN(i.unit_price)}</p>
              </div>
              <span className="font-mono text-sm">{formatPEN(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-400">Subtotal</dt><dd className="font-mono">{formatPEN(order.subtotal)}</dd></div>
          {Number(order.discount) > 0 && <div className="flex justify-between text-emerald-300"><dt>Descuento {order.coupon_code && `(${order.coupon_code})`}</dt><dd className="font-mono">−{formatPEN(order.discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-zinc-400">Envío</dt><dd className="font-mono">{Number(order.shipping_cost) === 0 ? "Gratis" : formatPEN(order.shipping_cost)}</dd></div>
          <div className="flex justify-between pt-2 text-base"><dt>Total</dt><dd className="font-display text-xl font-semibold">{formatPEN(order.total)}</dd></div>
        </dl>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-6 text-sm">
          <h2 className="mb-3 font-display text-lg font-semibold">Entrega</h2>
          <p className="text-zinc-300">{SHIPPING_METHOD_LABEL[order.shipping_method as ShippingMethod]}</p>
          {addr ? (
            <p className="mt-2 text-zinc-400">
              {addr.recipient} · {addr.phone}<br />
              {addr.line1}, {addr.district}, {addr.province} — {addr.department}
              {addr.reference && <><br />Ref.: {addr.reference}</>}
            </p>
          ) : (
            <p className="mt-2 text-zinc-400">{settings.address} · {settings.business_hours}</p>
          )}
        </section>
        <section className="card p-6 text-sm">
          <h2 className="mb-3 font-display text-lg font-semibold">Pago</h2>
          <p className="text-zinc-300">{PAYMENT_METHOD_LABEL[order.payment_method as PaymentMethod]}</p>
          <ul className="mt-2 space-y-1 text-zinc-400">
            {payments.map((p, i) => (
              <li key={i}>
                {PAYMENT_STATUS_LABEL[p.status] ?? p.status} · {formatPEN(p.amount)}
                {p.provider_payment_id && <span className="font-mono text-xs"> · #{p.provider_payment_id}</span>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Historial</h2>
        <ol className="space-y-3 border-l border-white/10 pl-5">
          {history.map((h, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />
              <p className="font-medium">{ORDER_STATUS_LABEL[h.status]}</p>
              <p className="text-xs text-zinc-500">{formatDate(h.created_at, true)}{h.note && ` · ${h.note}`}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
