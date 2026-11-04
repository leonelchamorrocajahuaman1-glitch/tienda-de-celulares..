/** Ejecutar: npx tsx --conditions=react-server tests/webhook-signature.test.ts */
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "../lib/payments/mercadopago";

const secret = "test-secret";
const dataId = "123456789";
const requestId = "req-abc";
const sign = (ts: string, id = dataId) =>
  createHmac("sha256", secret).update(`id:${id};request-id:${requestId};ts:${ts};`).digest("hex");

const now = String(Date.now());
const cases: [string, boolean, boolean][] = [
  ["firma válida", verifyWebhookSignature({ signature: `ts=${now},v1=${sign(now)}`, requestId, dataId, secret }), true],
  ["firma con otro secreto", verifyWebhookSignature({ signature: `ts=${now},v1=${sign(now)}`, requestId, dataId, secret: "otro" }), false],
  ["id de pago alterado", verifyWebhookSignature({ signature: `ts=${now},v1=${sign(now)}`, requestId, dataId: "999", secret }), false],
  ["sin cabecera", verifyWebhookSignature({ signature: null, requestId, dataId, secret }), false],
  ["firma antigua (replay)", (() => { const old = String(Date.now() - 3600_000); return verifyWebhookSignature({ signature: `ts=${old},v1=${sign(old)}`, requestId, dataId, secret }); })(), false],
  ["v1 malformado", verifyWebhookSignature({ signature: `ts=${now},v1=zz`, requestId, dataId, secret }), false],
];
let failed = 0;
for (const [label, got, want] of cases) {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
process.exit(failed ? 1 : 0);
