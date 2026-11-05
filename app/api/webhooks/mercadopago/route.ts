import { NextResponse, type NextRequest } from "next/server";
import { mpConfigured, verifyWebhookSignature } from "@/lib/payments/mercadopago";
import { processMercadoPagoPayment } from "@/lib/payments/process";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Webhook de Mercado Pago. Seguridad:
 * 1) Firma HMAC (x-signature) obligatoria en producción.
 * 2) El estado del pago NUNCA se toma del cuerpo: se consulta a la API de Mercado Pago.
 * 3) La confirmación en BD es idempotente y valida monto y stock.
 */
export async function POST(req: NextRequest) {
  if (!mpConfigured()) return NextResponse.json({ error: "no configurado" }, { status: 503 });
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type;
  const dataId = String(url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? body.data?.id ?? "");

  if (type !== "payment" || !dataId) return NextResponse.json({ ignored: true });

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    const valid = verifyWebhookSignature({
      signature: req.headers.get("x-signature"),
      requestId: req.headers.get("x-request-id"),
      dataId,
      secret,
    });
    if (!valid) return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "MP_WEBHOOK_SECRET requerido" }, { status: 503 });
  }

  try {
    const result = await processMercadoPagoPayment(dataId);
    return NextResponse.json({ received: true, status: result.ok ? result.status : result.reason });
  } catch (e) {
    console.error("[webhook mercadopago]", e);
    // 500 => Mercado Pago reintentará la notificación
    return NextResponse.json({ error: "error procesando" }, { status: 500 });
  }
}
