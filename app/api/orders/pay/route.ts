import { NextResponse } from "next/server";
import { z } from "zod";
import { siteUrl } from "@/lib/env";
import { createPreference, mpConfigured } from "@/lib/payments/mercadopago";
import { getServerSupabase } from "@/lib/supabase/server";

/** Reintentar el pago con Mercado Pago de un pedido propio pendiente. */
export async function POST(req: Request) {
  const sb = await getServerSupabase();
  if (!sb || !mpConfigured()) return NextResponse.json({ error: "Pagos no disponibles" }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const parsed = z.object({ orderId: z.string().uuid() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  // RLS: solo devuelve el pedido si pertenece al usuario
  const { data: order } = await sb
    .from("orders")
    .select("id, order_number, total, status, payment_method, customer_email, customer_name")
    .eq("id", parsed.data.orderId)
    .maybeSingle();
  if (!order || order.status !== "pending_payment" || order.payment_method !== "mercadopago") {
    return NextResponse.json({ error: "Este pedido no admite pago en línea" }, { status: 400 });
  }
  const pref = await createPreference({
    orderId: order.id,
    orderNumber: order.order_number,
    total: Number(order.total),
    description: `Pedido ${order.order_number}`,
    payerEmail: order.customer_email,
    payerName: order.customer_name,
    baseUrl: siteUrl(),
  });
  return NextResponse.json({ redirect: pref.url });
}
