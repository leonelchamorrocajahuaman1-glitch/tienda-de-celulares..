import { CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatPEN } from "@/lib/format";
import { mpConfigured } from "@/lib/payments/mercadopago";
import { processMercadoPagoPayment } from "@/lib/payments/process";

export const metadata = { title: "Resultado del pago" };
export const dynamic = "force-dynamic";

/**
 * Página de retorno de Mercado Pago. Los parámetros de la URL NO se consideran prueba de pago:
 * si llega un payment_id, se verifica directamente con la API de Mercado Pago.
 */
export default async function ResultPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; payment_id?: string; collection_id?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireUser("/cuenta/pedidos");
  if (!sp.order || !/^[0-9a-f-]{36}$/i.test(sp.order)) notFound();

  // RLS: solo pedidos propios
  const { data: before } = await supabase.from("orders").select("id, status").eq("id", sp.order).maybeSingle();
  if (!before) notFound();

  const paymentId = sp.payment_id ?? sp.collection_id;
  let verifyError = false;
  if (paymentId && before.status === "pending_payment" && mpConfigured() && /^\d+$/.test(paymentId)) {
    try {
      await processMercadoPagoPayment(paymentId, before.id);
    } catch (e) {
      console.error("[resultado] verificación", e);
      verifyError = true;
    }
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, total, receipt_number, payments(status, status_detail, created_at)")
    .eq("id", sp.order)
    .single();
  if (!order) notFound();
  const payments = (order.payments as { status: string; status_detail: string | null }[]) ?? [];
  const rejected = payments.some((p) => p.status === "rejected");
  const paid = ["paid", "processing", "shipped", "delivered"].includes(order.status);

  return (
    <div className="mx-auto max-w-xl px-6 pt-36 text-center">
      <div className="card p-10">
        {paid ? (
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-300" />
        ) : rejected ? (
          <XCircle className="mx-auto h-14 w-14 text-rose-300" />
        ) : (
          <Clock className="mx-auto h-14 w-14 text-amber-300" />
        )}
        <h1 className="mt-6 font-display text-3xl font-semibold">
          {paid ? "¡Pago confirmado!" : rejected ? "El pago fue rechazado" : "Pago en verificación"}
        </h1>
        <p className="mt-3 text-zinc-400">
          Pedido <span className="font-mono text-white">{order.order_number}</span> · {formatPEN(order.total)}
        </p>
        <p className="mt-4 text-sm text-zinc-400">
          {paid
            ? `Mercado Pago confirmó tu pago. Tu comprobante ${order.receipt_number ?? ""} ya está disponible.`
            : rejected
              ? "No se realizó ningún cobro. Puedes intentarlo nuevamente con otro medio de pago desde tu pedido."
              : "Aún no recibimos la confirmación de la pasarela. Te avisaremos en cuanto se acredite; no vuelvas a pagar."}
          {order.status === "requires_attention" && " Nuestro equipo revisará tu pedido y te contactará."}
          {verifyError && " (No pudimos consultar la pasarela en este momento; se actualizará automáticamente.)"}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/cuenta/pedidos/${order.id}`} className="btn btn-primary">Ver mi pedido</Link>
          <Link href="/catalogo" className="btn btn-ghost">Seguir comprando</Link>
        </div>
      </div>
    </div>
  );
}
