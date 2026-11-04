import { NextResponse } from "next/server";
import { z } from "zod";
import { siteUrl } from "@/lib/env";
import { createPreference, mpConfigured } from "@/lib/payments/mercadopago";
import { getServerSupabase } from "@/lib/supabase/server";

const schema = z
  .object({
    items: z.array(z.object({ variant_id: z.string().uuid(), quantity: z.number().int().min(1).max(10) })).min(1).max(30),
    shipping_method: z.enum(["standard", "express", "pickup"]),
    address_id: z.string().uuid().nullable(),
    payment_method: z.enum(["mercadopago", "bank_transfer", "cash_on_pickup"]),
    coupon_code: z.string().trim().max(30).regex(/^[A-Za-z0-9_-]*$/).optional(),
    receipt_type: z.enum(["boleta", "factura"]),
    document_type: z.enum(["DNI", "CE", "RUC", "PASAPORTE"]).nullable(),
    document_number: z.string().trim().regex(/^[A-Za-z0-9]{6,15}$/, "Documento inválido").nullable(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.shipping_method === "pickup" || d.address_id, { message: "Selecciona una dirección" })
  .refine((d) => d.payment_method !== "cash_on_pickup" || d.shipping_method === "pickup", {
    message: "El pago en tienda requiere recojo en tienda",
  })
  .refine((d) => d.receipt_type !== "factura" || (d.document_type === "RUC" && /^(10|20)\d{9}$/.test(d.document_number ?? "")), {
    message: "Para factura ingresa un RUC válido de 11 dígitos",
  });

/**
 * Crea el pedido. Precios, descuentos, envío y stock se calculan en la BD (create_order).
 * El navegador solo envía IDs de variantes y cantidades.
 */
export async function POST(req: Request) {
  const sb = await getServerSupabase();
  if (!sb) return NextResponse.json({ error: "La tienda aún no está conectada a Supabase." }, { status: 503 });
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión para continuar." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const d = parsed.data;

  if (d.payment_method === "mercadopago" && !mpConfigured()) {
    return NextResponse.json({ error: "El pago con Mercado Pago no está habilitado. Elige otro método." }, { status: 400 });
  }

  const { data: orderId, error } = await sb.rpc("create_order", {
    p_items: d.items,
    p_shipping_method: d.shipping_method,
    p_address_id: d.shipping_method === "pickup" ? null : d.address_id,
    p_payment_method: d.payment_method,
    p_coupon_code: d.coupon_code || null,
    p_receipt_type: d.receipt_type,
    p_document_type: d.document_type,
    p_document_number: d.document_number,
    p_notes: d.notes || null,
  });
  if (error || !orderId) {
    // Mensajes de validación de negocio (22023) se muestran al cliente; el resto se oculta
    const msg = error?.code === "22023" || error?.code === "42501" ? error.message : "No se pudo crear el pedido.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { data: order } = await sb
    .from("orders")
    .select("id, order_number, total, customer_email, customer_name, order_items(product_name, quantity)")
    .eq("id", orderId)
    .single();
  if (!order) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 500 });

  if (d.payment_method === "mercadopago") {
    try {
      const pref = await createPreference({
        orderId: order.id,
        orderNumber: order.order_number,
        total: Number(order.total),
        description: (order.order_items as { product_name: string; quantity: number }[])
          .map((i) => `${i.quantity}× ${i.product_name}`)
          .join(", "),
        payerEmail: order.customer_email,
        payerName: order.customer_name,
        baseUrl: siteUrl(),
      });
      return NextResponse.json({ orderId: order.id, redirect: pref.url });
    } catch (e) {
      console.error("[checkout] preferencia MP", e);
      return NextResponse.json({
        orderId: order.id,
        redirect: `/cuenta/pedidos/${order.id}?pago=error`,
        warning: "El pedido se creó, pero no pudimos iniciar el pago. Puedes reintentarlo desde tu pedido.",
      });
    }
  }
  return NextResponse.json({ orderId: order.id, redirect: `/cuenta/pedidos/${order.id}?nuevo=1` });
}
