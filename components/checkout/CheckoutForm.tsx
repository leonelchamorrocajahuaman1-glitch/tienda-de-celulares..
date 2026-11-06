"use client";

import { Building2, CreditCard, Landmark, Loader2, Lock, MapPin, Plus, Store, Truck, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { type Address, AddressForm } from "@/components/account/AddressForm";
import { Select } from "@/components/ui/Select";
import { useCartQuote } from "@/components/cart/useCartQuote";
import { cartSubtotal, useCart, useCartHydrated } from "@/lib/cart-store";
import { formatPEN } from "@/lib/format";
import type { PaymentMethod, ShippingMethod, StoreSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  addresses: Address[];
  settings: StoreSettings;
  profile: { full_name: string; phone: string; document_type: string | null; document_number: string | null };
  mercadoPagoEnabled: boolean;
  testMode: boolean;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="mb-5 flex items-center gap-3 font-display text-lg font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-electric to-cyan-500 font-mono text-xs">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Option({ active, onClick, icon: Icon, title, desc, right, disabled }: {
  active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; title: string; desc: string; right?: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40",
        active ? "border-cyan-400/60 bg-cyan-400/[0.07]" : "border-white/10 hover:border-white/25",
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-cyan-300" : "text-zinc-400")} />
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-xs text-zinc-400">{desc}</span>
      </span>
      {right && <span className="font-mono text-sm">{right}</span>}
    </button>
  );
}

export function CheckoutForm({ addresses: initialAddresses, settings, profile, mercadoPagoEnabled, testMode }: Props) {
  const router = useRouter();
  const { items, clear } = useCart();
  const hydrated = useCartHydrated();
  const notice = useCartQuote();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState<string | null>(
    initialAddresses.find((a) => a.is_default)?.id ?? initialAddresses[0]?.id ?? null,
  );
  const [adding, setAdding] = useState(initialAddresses.length === 0);
  const [shipping, setShipping] = useState<ShippingMethod>("standard");
  const [payment, setPayment] = useState<PaymentMethod>(mercadoPagoEnabled ? "mercadopago" : "bank_transfer");
  const [receipt, setReceipt] = useState<"boleta" | "factura">("boleta");
  const [docType, setDocType] = useState(profile.document_type ?? "DNI");
  const [docNumber, setDocNumber] = useState(profile.document_number ?? "");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponState, setCouponState] = useState<{ valid: boolean; discount: number; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const c = sessionStorage.getItem("nx-coupon");
      if (c) setCoupon(c);
    } catch {}
  }, []);

  const subtotal = cartSubtotal(items);
  const discount = couponState?.valid ? couponState.discount : 0;
  const shippingCost = useMemo(() => {
    if (shipping === "pickup") return 0;
    if (shipping === "express") return settings.shipping_express;
    return subtotal - discount >= settings.free_shipping_from ? 0 : settings.shipping_standard;
  }, [shipping, subtotal, discount, settings]);
  const total = Math.max(0, subtotal - discount + shippingCost);

  useEffect(() => {
    if (payment === "cash_on_pickup" && shipping !== "pickup") setPayment(mercadoPagoEnabled ? "mercadopago" : "bank_transfer");
  }, [shipping, payment, mercadoPagoEnabled]);
  useEffect(() => {
    if (receipt === "factura") setDocType("RUC");
  }, [receipt]);

  const checkCoupon = async () => {
    if (!coupon.trim()) return setCouponState(null);
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon.trim(), items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })) }),
    });
    const data = await res.json();
    setCouponState({ valid: Boolean(data.valid), discount: Number(data.discount ?? 0), message: data.message ?? "Cupón no válido" });
  };

  const submit = async () => {
    setError(null);
    if (shipping !== "pickup" && !addressId) return setError("Selecciona o agrega una dirección de entrega.");
    if (receipt === "factura" && !/^(10|20)\d{9}$/.test(docNumber)) return setError("Ingresa un RUC válido de 11 dígitos.");
    if (docNumber && !/^[A-Za-z0-9]{6,15}$/.test(docNumber)) return setError("Número de documento inválido.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
          shipping_method: shipping,
          address_id: shipping === "pickup" ? null : addressId,
          payment_method: payment,
          coupon_code: couponState?.valid ? coupon.trim() : undefined,
          receipt_type: receipt,
          document_type: docNumber ? docType : null,
          document_number: docNumber || null,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el pedido.");
        return;
      }
      clear();
      try {
        sessionStorage.removeItem("nx-coupon");
      } catch {}
      if (/^https:\/\//.test(data.redirect)) window.location.href = data.redirect;
      else router.push(data.redirect);
    } catch {
      setError("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hydrated) return <div className="skeleton h-96 rounded-3xl" />;
  if (items.length === 0)
    return (
      <div className="card grid place-items-center gap-4 px-6 py-20 text-center">
        <p className="font-display text-xl">No hay productos en tu carrito.</p>
        <Link href="/catalogo" className="btn btn-primary">Ir al catálogo</Link>
      </div>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-5">
        {notice && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">{notice}</p>}

        <Step n={1} title="Método de entrega">
          <div className="grid gap-3">
            <Option active={shipping === "standard"} onClick={() => setShipping("standard")} icon={Truck} title="Envío estándar" desc={`2–4 días hábiles · gratis desde ${formatPEN(settings.free_shipping_from)}`} right={subtotal - discount >= settings.free_shipping_from ? "Gratis" : formatPEN(settings.shipping_standard)} />
            <Option active={shipping === "express"} onClick={() => setShipping("express")} icon={Zap} title="Express Lima" desc="Entrega en 24 h en Lima Metropolitana" right={formatPEN(settings.shipping_express)} />
            <Option active={shipping === "pickup"} onClick={() => setShipping("pickup")} icon={Store} title="Recojo en tienda" desc={settings.address} right="Gratis" />
          </div>
        </Step>

        {shipping !== "pickup" && (
          <Step n={2} title="Dirección de entrega">
            {!adding && (
              <div className="grid gap-3">
                {addresses.map((a) => (
                  <Option
                    key={a.id}
                    active={addressId === a.id}
                    onClick={() => setAddressId(a.id)}
                    icon={MapPin}
                    title={`${a.label} · ${a.recipient}`}
                    desc={`${a.line1}, ${a.district}, ${a.province} — ${a.department}`}
                  />
                ))}
                <button type="button" onClick={() => setAdding(true)} className="btn btn-ghost w-fit">
                  <Plus className="h-4 w-4" /> Agregar dirección
                </button>
              </div>
            )}
            {adding && (
              <AddressForm
                defaultRecipient={profile.full_name}
                defaultPhone={profile.phone}
                onCancel={addresses.length ? () => setAdding(false) : undefined}
                onSaved={(addr) => {
                  setAdding(false);
                  setAddressId(addr.id);
                  setAddresses((prev) => [...prev.filter((p) => p.id !== addr.id), addr]);
                }}
              />
            )}
          </Step>
        )}

        <Step n={shipping === "pickup" ? 2 : 3} title="Método de pago">
          <div className="grid gap-3">
            <Option active={payment === "mercadopago"} onClick={() => setPayment("mercadopago")} disabled={!mercadoPagoEnabled} icon={CreditCard} title="Tarjeta de crédito/débito o Yape" desc={mercadoPagoEnabled ? "Pago seguro con Mercado Pago" : "No disponible: Mercado Pago no está configurado"} />
            <Option active={payment === "bank_transfer"} onClick={() => setPayment("bank_transfer")} icon={Landmark} title="Transferencia bancaria" desc="Confirmaremos tu pedido al validar la operación" />
            <Option active={payment === "cash_on_pickup"} onClick={() => setPayment("cash_on_pickup")} disabled={shipping !== "pickup"} icon={Building2} title="Pago en tienda" desc="Disponible solo con recojo en tienda" />
          </div>
          {testMode && payment === "mercadopago" && (
            <p className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3 text-xs text-violet-200">
              Mercado Pago está en <strong>modo de pruebas</strong>: usa tarjetas de prueba. No se realizará ningún cobro real.
            </p>
          )}
        </Step>

        <Step n={shipping === "pickup" ? 3 : 4} title="Comprobante">
          <div className="mb-4 inline-flex rounded-full border border-white/10 p-1">
            {(["boleta", "factura"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setReceipt(r)} className={cn("rounded-full px-4 py-1.5 text-sm capitalize", receipt === r ? "bg-white/15" : "text-zinc-400")}>
                {r}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
            <div>
              <label className="label" htmlFor="doc-type">Documento</label>
              <Select
                id="doc-type"
                value={docType}
                onChange={setDocType}
                disabled={receipt === "factura"}
                options={["DNI", "CE", "RUC", "PASAPORTE"].map((v) => ({ value: v, label: v === "PASAPORTE" ? "Pasaporte" : v }))}
              />
            </div>
            <div>
              <label className="label" htmlFor="doc-number">Número {receipt === "boleta" && "(opcional)"}</label>
              <input id="doc-number" className="input" inputMode="numeric" value={docNumber} onChange={(e) => setDocNumber(e.target.value.replace(/[^A-Za-z0-9]/g, ""))} maxLength={15} />
            </div>
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="notes">Notas para el pedido (opcional)</label>
            <textarea id="notes" className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>
        </Step>
      </div>

      <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-semibold">Tu pedido</h2>
        <ul className="max-h-72 space-y-3 overflow-y-auto">
          {items.map((i) => (
            <li key={i.variantId} className="flex gap-3">
              <div className="relative h-16 w-14 shrink-0 rounded-xl bg-white/[0.04]">
                {i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-contain p-1" />}
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-cyan-400 text-[0.65rem] font-bold text-ink-950">{i.quantity}</span>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-medium">{i.name}</p>
                <p className="truncate text-xs text-zinc-400">{i.variantLabel}</p>
              </div>
              <span className="font-mono text-sm">{formatPEN(i.unitPrice * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div>
          <div className="flex gap-2">
            <input aria-label="Cupón" value={coupon} onChange={(e) => { setCoupon(e.target.value.toUpperCase()); setCouponState(null); }} placeholder="CUPÓN" className="input uppercase" maxLength={30} />
            <button type="button" onClick={checkCoupon} className="btn btn-ghost !px-4">Aplicar</button>
          </div>
          {couponState && <p className={cn("mt-2 text-xs", couponState.valid ? "text-emerald-300" : "text-rose-300")}>{couponState.message}</p>}
        </div>
        <dl className="space-y-2 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-400">Subtotal</dt><dd className="font-mono">{formatPEN(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-emerald-300"><dt>Descuento</dt><dd className="font-mono">−{formatPEN(discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-zinc-400">Envío</dt><dd className="font-mono">{shippingCost === 0 ? "Gratis" : formatPEN(shippingCost)}</dd></div>
          <div className="flex items-baseline justify-between pt-2">
            <dt className="text-zinc-300">Total</dt>
            <dd className="font-display text-2xl font-semibold">{formatPEN(total)}</dd>
          </div>
        </dl>
        {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        <button onClick={submit} disabled={submitting} className="btn btn-primary w-full !py-3.5">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          {payment === "mercadopago" ? "Confirmar y pagar" : "Confirmar pedido"}
        </button>
        <p className="text-center text-xs text-zinc-500">
          Los precios, el stock y el total se verifican en el servidor. Al confirmar aceptas los <Link href="/legal/terminos" className="underline">términos</Link>.
        </p>
      </aside>
    </div>
  );
}
