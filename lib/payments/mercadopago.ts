import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Integración con Mercado Pago (Checkout Pro) — Perú, moneda PEN.
 * Documentación: https://www.mercadopago.com.pe/developers/es/docs/checkout-pro
 * El token de acceso es secreto y solo se usa en el servidor.
 */
const API = "https://api.mercadopago.com";

export function mpConfigured() {
  return Boolean(process.env.MP_ACCESS_TOKEN);
}
export function mpIsTestMode() {
  const t = process.env.MP_ACCESS_TOKEN ?? "";
  return t.startsWith("TEST-") || process.env.MP_TEST_MODE === "1";
}

async function mpFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Mercado Pago ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface MPPreferenceInput {
  orderId: string;
  orderNumber: string;
  total: number;
  description: string;
  payerEmail: string;
  payerName?: string;
  baseUrl: string;
}

export async function createPreference(input: MPPreferenceInput) {
  const notification = process.env.MP_NOTIFICATION_URL || `${input.baseUrl}/api/webhooks/mercadopago`;
  const resultUrl = `${input.baseUrl}/checkout/resultado?order=${input.orderId}`;
  const pref = await mpFetch<{ id: string; init_point: string; sandbox_init_point: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": `pref-${input.orderId}` },
    body: JSON.stringify({
      // Un único ítem por el total calculado en la BD (incluye descuentos y envío)
      items: [
        {
          id: input.orderNumber,
          title: `Pedido ${input.orderNumber} — NEXPHONE`,
          description: input.description.slice(0, 250),
          quantity: 1,
          currency_id: "PEN",
          unit_price: Number(input.total.toFixed(2)),
        },
      ],
      payer: { email: input.payerEmail, name: input.payerName },
      external_reference: input.orderId,
      notification_url: notification.startsWith("https://") ? notification : undefined,
      back_urls: { success: resultUrl, pending: resultUrl, failure: resultUrl },
      auto_return: input.baseUrl.startsWith("https://") ? "approved" : undefined,
      statement_descriptor: "NEXPHONE",
      binary_mode: false,
      expires: true,
      expiration_date_to: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      metadata: { order_id: input.orderId },
    }),
  });
  return { id: pref.id, url: mpIsTestMode() ? pref.sandbox_init_point || pref.init_point : pref.init_point };
}

export interface MPPayment {
  id: number;
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded" | "charged_back" | "authorized";
  status_detail: string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
  live_mode: boolean;
  payment_method_id?: string;
  payment_type_id?: string;
  date_approved?: string | null;
}

export async function getPayment(id: string | number) {
  if (!/^\d{1,20}$/.test(String(id))) throw new Error("ID de pago inválido");
  return mpFetch<MPPayment>(`/v1/payments/${id}`);
}

/**
 * Valida la cabecera x-signature de las notificaciones (HMAC-SHA256 con la clave secreta del webhook).
 * Manifiesto: id:{data.id};request-id:{x-request-id};ts:{ts};
 */
export function verifyWebhookSignature(opts: { signature: string | null; requestId: string | null; dataId: string; secret: string }) {
  if (!opts.signature) return false;
  const parts = Object.fromEntries(
    opts.signature.split(",").map((p) => {
      const [k, v] = p.split("=").map((s) => s.trim());
      return [k, v];
    }),
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  // Rechaza notificaciones con más de 10 minutos de antigüedad (anti-replay)
  const tsMs = ts.length > 11 ? Number(ts) : Number(ts) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > 10 * 60 * 1000) return false;
  const id = /^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId;
  let manifest = `id:${id};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac("sha256", opts.secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(v1, "hex"));
  } catch {
    return false;
  }
}
