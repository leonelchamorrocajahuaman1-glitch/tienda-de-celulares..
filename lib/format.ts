import type { OrderStatus, PaymentMethod, ShippingMethod } from "@/lib/types";

const pen = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

/** Formato de moneda en soles: S/ 1,299.00 */
export function formatPEN(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return pen.format(Number.isFinite(n) ? n : 0).replace("PEN", "S/").replace(/ /g, " ");
}

export function formatStorage(gb: number): string {
  return gb >= 1024 ? `${gb / 1024} TB` : `${gb} GB`;
}

export function discountPercent(price: number, compare: number | null | undefined): number {
  if (!compare || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

export function formatDate(value: string | Date, withTime = false): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "America/Lima",
  }).format(d);
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  processing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  requires_attention: "Requiere revisión",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: "text-amber-300 bg-amber-400/10 ring-amber-400/30",
  paid: "text-cyan-300 bg-cyan-400/10 ring-cyan-400/30",
  processing: "text-sky-300 bg-sky-400/10 ring-sky-400/30",
  shipped: "text-violet-300 bg-violet-400/10 ring-violet-400/30",
  delivered: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/30",
  cancelled: "text-zinc-400 bg-zinc-400/10 ring-zinc-400/30",
  refunded: "text-zinc-300 bg-zinc-400/10 ring-zinc-400/30",
  requires_attention: "text-rose-300 bg-rose-400/10 ring-rose-400/30",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  mercadopago: "Mercado Pago (tarjeta, Yape)",
  bank_transfer: "Transferencia bancaria",
  cash_on_pickup: "Pago en tienda",
};

export const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  standard: "Envío estándar (2–4 días hábiles)",
  express: "Envío express Lima (24 h)",
  pickup: "Recojo en tienda",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  in_process: "En proceso",
};
