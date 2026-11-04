import "server-only";
import { getServiceSupabase } from "@/lib/supabase/server";
import { type MPPayment, getPayment } from "@/lib/payments/mercadopago";

const MAP: Record<string, "pending" | "in_process" | "rejected" | "cancelled" | "refunded"> = {
  pending: "pending",
  in_process: "in_process",
  authorized: "in_process",
  rejected: "rejected",
  cancelled: "cancelled",
  refunded: "refunded",
  charged_back: "refunded",
};

/**
 * Procesa un pago consultándolo directamente en la API de Mercado Pago (fuente de verdad).
 * Idempotente: puede llamarse desde el webhook y desde la página de resultado.
 */
export async function processMercadoPagoPayment(paymentId: string, expectedOrderId?: string) {
  const admin = getServiceSupabase();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada");
  const payment: MPPayment = await getPayment(paymentId);
  const orderId = payment.external_reference;
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return { ok: false, reason: "sin referencia" as const };
  if (expectedOrderId && orderId !== expectedOrderId) return { ok: false, reason: "referencia distinta" as const };
  if (payment.currency_id !== "PEN") return { ok: false, reason: "moneda" as const };

  const raw = {
    id: payment.id,
    status: payment.status,
    status_detail: payment.status_detail,
    amount: payment.transaction_amount,
    method: payment.payment_method_id,
    type: payment.payment_type_id,
    live_mode: payment.live_mode,
    date_approved: payment.date_approved,
  };

  if (payment.status === "approved") {
    const { data, error } = await admin.rpc("confirm_order_payment", {
      p_order_id: orderId,
      p_provider: "mercadopago",
      p_provider_payment_id: String(payment.id),
      p_amount: payment.transaction_amount,
      p_is_test: !payment.live_mode,
      p_raw: raw,
      p_reference: payment.payment_method_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, status: "approved" as const, result: data };
  }
  const mapped = MAP[payment.status] ?? "pending";
  const { error } = await admin.rpc("record_payment_event", {
    p_order_id: orderId,
    p_provider: "mercadopago",
    p_provider_payment_id: String(payment.id),
    p_status: mapped,
    p_status_detail: payment.status_detail,
    p_amount: payment.transaction_amount,
    p_is_test: !payment.live_mode,
    p_raw: raw,
  });
  if (error) throw new Error(error.message);
  return { ok: true, status: mapped };
}
