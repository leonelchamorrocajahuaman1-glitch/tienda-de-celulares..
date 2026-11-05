/**
 * Integración de pagos: lógica del servidor + funciones SQL reales en PostgreSQL local.
 * La API de Mercado Pago se sustituye por respuestas simuladas: NO hay dinero ni pasarela real.
 *
 * Requiere: base de pruebas con migraciones + seed (TEST_DATABASE_URL).
 * Ejecutar: TEST_DATABASE_URL=postgresql://... npx tsx --conditions=react-server tests/payments.integration.test.ts
 */
import pg from "pg";
import { createPreference, type MPPayment } from "../lib/payments/mercadopago";
import { processMercadoPagoPayment } from "../lib/payments/process";

const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
let failed = 0;
const check = (ok: boolean, label: string) => {
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
};

/** Cliente RPC equivalente a supabase-js con service_role, ejecutando la función SQL real. */
const serviceRpc = {
  async rpc(fn: string, args: Record<string, unknown>) {
    const keys = Object.keys(args);
    const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`;
    try {
      await db.query("begin");
      await db.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`);
      await db.query("set local role service_role");
      const res = await db.query(sql, keys.map((k) => (args[k] !== null && typeof args[k] === "object" ? JSON.stringify(args[k]) : args[k])));
      await db.query("commit");
      return { data: res.rows[0].r, error: null };
    } catch (e) {
      await db.query("rollback");
      return { data: null, error: { message: (e as Error).message } };
    }
  },
};

async function asCustomer<T>(uid: string, fn: () => Promise<T>) {
  await db.query("begin");
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: "authenticated" })]);
  await db.query("set local role authenticated");
  try {
    const r = await fn();
    await db.query("commit");
    return r;
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
}

const payment = (o: Partial<MPPayment>): MPPayment => ({
  id: 1001,
  status: "approved",
  status_detail: "accredited",
  external_reference: null,
  transaction_amount: 0,
  currency_id: "PEN",
  live_mode: false,
  payment_method_id: "visa",
  payment_type_id: "credit_card",
  date_approved: new Date().toISOString(),
  ...o,
});

async function main() {
  await db.connect();
  const uid = "55555555-5555-4555-a555-555555555555";
  await db.query(`insert into auth.users (id, email, email_confirmed_at) values ($1, 'compra@test.pe', now()) on conflict do nothing`, [uid]);
  const { rows: v } = await db.query(`select v.id, i.stock from public.product_variants v join public.inventory i on i.variant_id = v.id where v.sku like 'PIXEL-10-PRO-OBSIDIANA-16-256' limit 1`);
  const variantId = v[0].id as string;
  const stock0 = v[0].stock as number;

  // 1) Creación del pedido por el cliente (precios desde la BD)
  const orderId = await asCustomer(uid, async () => {
    const r = await db.query(`select public.create_order($1::jsonb, 'pickup', null, 'mercadopago') as id`, [JSON.stringify([{ variant_id: variantId, quantity: 2 }])]);
    return r.rows[0].id as string;
  });
  const { rows: o } = await db.query("select total, order_number from public.orders where id = $1", [orderId]);
  const total = Number(o[0].total);
  check(total === 9598, `Pedido creado con total calculado en BD (S/ ${total})`);

  // 2) Creación de la preferencia de pago (petición a la API simulada)
  process.env.MP_ACCESS_TOKEN = "TEST-local-placeholder";
  let sent: Record<string, unknown> | null = null;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    sent = { url, body: JSON.parse(String(init?.body)), headers: init?.headers };
    return new Response(JSON.stringify({ id: "pref-1", init_point: "https://www.mercadopago.com.pe/checkout/v1/redirect?pref_id=pref-1", sandbox_init_point: "https://sandbox.mercadopago.com.pe/checkout/v1/redirect?pref_id=pref-1" }), { status: 201 });
  }) as typeof fetch;
  const pref = await createPreference({ orderId, orderNumber: o[0].order_number, total, description: "2× Pixel 10 Pro", payerEmail: "compra@test.pe", baseUrl: "https://nexphone.example" });
  globalThis.fetch = realFetch;
  const body = (sent as unknown as { body: { items: { unit_price: number; currency_id: string }[]; external_reference: string; notification_url: string } }).body;
  check(body.items[0].unit_price === total && body.items[0].currency_id === "PEN", "Preferencia: monto = total del pedido, moneda PEN");
  check(body.external_reference === orderId, "Preferencia: external_reference = id del pedido");
  check(body.notification_url === "https://nexphone.example/api/webhooks/mercadopago", "Preferencia: URL del webhook");
  check(pref.url.includes("sandbox"), "Modo pruebas usa el checkout sandbox");

  // 3) Webhook: pago rechazado → registra, no descuenta stock
  const r1 = await processMercadoPagoPayment("2001", undefined, { admin: serviceRpc, fetchPayment: async () => payment({ id: 2001, status: "rejected", status_detail: "cc_rejected_insufficient_amount", external_reference: orderId, transaction_amount: total }) });
  const st1 = await db.query("select status from public.orders where id = $1", [orderId]);
  check(r1.ok && r1.status === "rejected" && st1.rows[0].status === "pending_payment", "Pago rechazado: pedido sigue pendiente");

  // 4) Moneda distinta → ignorado
  const r2 = await processMercadoPagoPayment("2002", undefined, { admin: serviceRpc, fetchPayment: async () => payment({ id: 2002, external_reference: orderId, transaction_amount: total, currency_id: "USD" }) });
  check(!r2.ok, "Pago en otra moneda: rechazado");

  // 5) Referencia distinta a la esperada (página de retorno) → ignorado
  const r3 = await processMercadoPagoPayment("2003", orderId, { admin: serviceRpc, fetchPayment: async () => payment({ id: 2003, external_reference: "00000000-0000-4000-a000-000000000000", transaction_amount: total }) });
  check(!r3.ok, "Pago de otro pedido: rechazado");

  // 6) Aprobado → pedido pagado, inventario descontado, transacción y comprobante
  const r4 = await processMercadoPagoPayment("2004", undefined, { admin: serviceRpc, fetchPayment: async () => payment({ id: 2004, external_reference: orderId, transaction_amount: total }) });
  const st = await db.query("select status, receipt_number, paid_at from public.orders where id = $1", [orderId]);
  const inv = await db.query("select stock from public.inventory where variant_id = $1", [variantId]);
  const pay = await db.query("select status, provider_payment_id, is_test from public.payments where order_id = $1 and status = 'approved'", [orderId]);
  check(r4.ok && st.rows[0].status === "paid" && st.rows[0].paid_at, "Pago aprobado: pedido Pagado");
  check(inv.rows[0].stock === stock0 - 2, `Inventario actualizado (${stock0} → ${inv.rows[0].stock})`);
  check(pay.rows.length === 1 && pay.rows[0].provider_payment_id === "2004" && pay.rows[0].is_test === true, "Transacción registrada (id de pasarela, marcada como prueba)");
  check(/^B001-\d{8}$/.test(st.rows[0].receipt_number), `Comprobante generado (${st.rows[0].receipt_number})`);

  // 7) Notificación repetida → idempotente
  await processMercadoPagoPayment("2004", undefined, { admin: serviceRpc, fetchPayment: async () => payment({ id: 2004, external_reference: orderId, transaction_amount: total }) });
  const inv2 = await db.query("select stock from public.inventory where variant_id = $1", [variantId]);
  check(inv2.rows[0].stock === stock0 - 2, "Webhook repetido no descuenta stock dos veces");

  // 8) Pago por monto menor en otro pedido → requiere revisión, sin descontar stock
  const order2 = await asCustomer(uid, async () => (await db.query(`select public.create_order($1::jsonb, 'pickup', null, 'mercadopago') as id`, [JSON.stringify([{ variant_id: variantId, quantity: 1 }])])).rows[0].id as string);
  await processMercadoPagoPayment("2005", undefined, { admin: serviceRpc, fetchPayment: async () => payment({ id: 2005, external_reference: order2, transaction_amount: 1 }) });
  const st3 = await db.query("select status from public.orders where id = $1", [order2]);
  const inv3 = await db.query("select stock from public.inventory where variant_id = $1", [variantId]);
  check(st3.rows[0].status === "requires_attention" && inv3.rows[0].stock === stock0 - 2, "Monto incompleto: pedido en revisión, stock intacto");

  await db.end();
  console.log(`\n${failed ? `${failed} FALLIDAS` : "Todas las pruebas de pagos pasaron"}`);
  process.exit(failed ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await db.end().catch(() => {});
  process.exit(1);
});
