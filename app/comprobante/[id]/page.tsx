import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButtons } from "@/components/account/PrintButton";
import { requireUser } from "@/lib/auth";
import { getStoreSettings } from "@/lib/data/catalog";
import { PAYMENT_METHOD_LABEL, SHIPPING_METHOD_LABEL, formatDate, formatPEN } from "@/lib/format";
import type { PaymentMethod, ShippingMethod } from "@/lib/types";

export const metadata = { title: "Comprobante", robots: { index: false } };
export const dynamic = "force-dynamic";

const IGV = 0.18;

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireUser(`/comprobante/${id}`);
  // RLS: el cliente solo ve sus pedidos; el administrador ve todos.
  const [{ data: o }, s] = await Promise.all([
    supabase.from("orders").select("*, order_items(*), payments(provider, status, provider_payment_id, provider_reference)").eq("id", id).maybeSingle(),
    getStoreSettings(),
  ]);
  if (!o || !o.receipt_number) notFound();

  const items = o.order_items as { id: string; product_name: string; variant_label: string; sku: string; unit_price: number; quantity: number; line_total: number }[];
  const total = Number(o.total);
  const base = Math.round((total / (1 + IGV)) * 100) / 100;
  const igv = Math.round((total - base) * 100) / 100;
  const pay = (o.payments as { provider: string; status: string; provider_payment_id: string | null; provider_reference: string | null }[]).find((p) => p.status === "approved");
  const electronic = process.env.SUNAT_EINVOICING_ENABLED === "1";

  return (
    <div className="min-h-dvh bg-zinc-100 px-4 py-10 text-zinc-900 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between no-print">
        <Link href={`/cuenta/pedidos/${o.id}`} className="text-sm text-zinc-600 hover:text-black">← Volver al pedido</Link>
        <PrintButtons />
      </div>
      <article className="mx-auto max-w-3xl bg-white p-10 shadow-xl print:max-w-none print:p-6 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-zinc-200 pb-6">
          <div>
            <p className="font-display text-2xl font-bold tracking-[0.2em]">NEXPHONE</p>
            <p className="mt-2 text-sm text-zinc-600">{s.legal_name}</p>
            {s.ruc && <p className="text-sm text-zinc-600">RUC {s.ruc}</p>}
            <p className="text-sm text-zinc-600">{s.address}</p>
            <p className="text-sm text-zinc-600">{s.email}{s.phone && ` · ${s.phone}`}</p>
          </div>
          <div className="rounded-lg border-2 border-zinc-900 px-6 py-4 text-center">
            {s.ruc && <p className="text-sm font-semibold">RUC {s.ruc}</p>}
            <p className="text-sm font-bold uppercase">{o.receipt_type === "factura" ? "Factura" : "Boleta de venta"}{electronic ? " electrónica" : ""}</p>
            <p className="font-mono text-lg font-bold">{o.receipt_number}</p>
          </div>
        </header>

        <section className="grid gap-4 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500">Cliente</p>
            <p className="font-medium">{o.customer_name}</p>
            {o.document_number && <p>{o.document_type ?? "Doc."}: {o.document_number}</p>}
            <p>{o.customer_email}</p>
            {o.customer_phone && <p>{o.customer_phone}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Emisión</p>
            <p>{formatDate(o.paid_at ?? o.created_at, true)}</p>
            <p>Pedido {o.order_number}</p>
            <p>Moneda: Soles (PEN)</p>
            <p>{PAYMENT_METHOD_LABEL[o.payment_method as PaymentMethod]}{pay?.provider_payment_id && ` · Op. ${pay.provider_payment_id}`}</p>
          </div>
        </section>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-zinc-300 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="py-2">Cant.</th>
              <th className="py-2">Descripción</th>
              <th className="py-2 text-right">P. unit.</th>
              <th className="py-2 text-right">Importe</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b border-zinc-100 align-top">
                <td className="py-2">{i.quantity}</td>
                <td className="py-2">
                  {i.product_name}
                  <span className="block text-xs text-zinc-500">{i.variant_label} · SKU {i.sku}</span>
                </td>
                <td className="py-2 text-right font-mono">{formatPEN(i.unit_price)}</td>
                <td className="py-2 text-right font-mono">{formatPEN(i.line_total)}</td>
              </tr>
            ))}
            {Number(o.shipping_cost) > 0 && (
              <tr className="border-b border-zinc-100">
                <td className="py-2">1</td>
                <td className="py-2">{SHIPPING_METHOD_LABEL[o.shipping_method as ShippingMethod]}</td>
                <td className="py-2 text-right font-mono">{formatPEN(o.shipping_cost)}</td>
                <td className="py-2 text-right font-mono">{formatPEN(o.shipping_cost)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-1 text-sm">
          {Number(o.discount) > 0 && (
            <div className="flex justify-between"><dt>Descuento {o.coupon_code && `(${o.coupon_code})`}</dt><dd className="font-mono">−{formatPEN(o.discount)}</dd></div>
          )}
          <div className="flex justify-between"><dt>Op. gravada</dt><dd className="font-mono">{formatPEN(base)}</dd></div>
          <div className="flex justify-between"><dt>IGV (18%)</dt><dd className="font-mono">{formatPEN(igv)}</dd></div>
          <div className="flex justify-between border-t border-zinc-900 pt-2 text-base font-bold"><dt>Total</dt><dd className="font-mono">{formatPEN(total)}</dd></div>
        </dl>

        <footer className="mt-10 border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          {electronic ? (
            <p>Representación impresa del comprobante electrónico. Consulte su validez en el portal de SUNAT.</p>
          ) : (
            <p>
              Comprobante de compra emitido por {s.store_name}. Documento de control interno: la emisión electrónica ante SUNAT
              se habilita al integrar un proveedor OSE/PSE.
            </p>
          )}
          <p className="mt-1">Gracias por comprar en NEXPHONE.</p>
        </footer>
      </article>
    </div>
  );
}
