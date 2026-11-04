"use client";

import { ArrowRight, ShoppingBag, Tag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCartQuote } from "@/components/cart/useCartQuote";
import { QtyStepper } from "@/components/store/QtyStepper";
import { MAX_QTY, cartSubtotal, useCart } from "@/lib/cart-store";
import { formatPEN } from "@/lib/format";

export function CartPage({ freeShippingFrom }: { freeShippingFrom: number }) {
  const { items, hydrated, setQty, remove } = useCart();
  const notice = useCartQuote();
  const subtotal = cartSubtotal(items);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; message: string; valid: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  const validate = async () => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })) }),
      });
      const data = await res.json();
      setCoupon({ code: data.code ?? code, discount: Number(data.discount ?? 0), message: data.message ?? "Cupón no válido", valid: Boolean(data.valid) });
      if (data.valid) sessionStorage.setItem("nx-coupon", data.code);
    } finally {
      setChecking(false);
    }
  };

  if (!hydrated) return <div className="skeleton h-96 rounded-3xl" />;

  if (items.length === 0)
    return (
      <div className="card grid place-items-center gap-4 px-6 py-24 text-center">
        <ShoppingBag className="h-10 w-10 text-cyan-300" />
        <h2 className="font-display text-2xl font-semibold">Tu carrito está vacío</h2>
        <p className="text-zinc-400">Descubre los smartphones más avanzados del mercado.</p>
        <Link href="/catalogo" className="btn btn-primary">Explorar colección</Link>
      </div>
    );

  const discount = coupon?.valid ? coupon.discount : 0;
  const remaining = Math.max(0, freeShippingFrom - (subtotal - discount));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        {notice && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">{notice}</p>}
        {items.map((it) => (
          <div key={it.variantId} className="card flex gap-5 p-4">
            <Link href={`/producto/${it.slug}`} className="relative h-32 w-28 shrink-0 rounded-2xl bg-white/[0.03]">
              {it.image && <Image src={it.image} alt={it.name} fill sizes="112px" className="object-contain p-2" />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-zinc-500">{it.brand}</p>
                  <Link href={`/producto/${it.slug}`} className="font-display text-lg font-semibold hover:text-cyan-200">{it.name}</Link>
                  <p className="flex items-center gap-1.5 text-sm text-zinc-400">
                    <span className="h-3 w-3 rounded-full ring-1 ring-white/30" style={{ background: it.colorHex }} />
                    {it.variantLabel}
                  </p>
                </div>
                <button onClick={() => remove(it.variantId)} className="self-start rounded-full p-2 text-zinc-500 hover:bg-white/10 hover:text-rose-300" aria-label={`Eliminar ${it.name}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                <QtyStepper value={it.quantity} max={Math.min(MAX_QTY, it.maxStock)} onChange={(v) => setQty(it.variantId, v)} />
                <div className="text-right">
                  <p className="text-xs text-zinc-500">{formatPEN(it.unitPrice)} c/u</p>
                  <p className="font-mono">{formatPEN(it.unitPrice * it.quantity)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <aside className="card h-fit space-y-5 p-6 lg:sticky lg:top-28">
        <h2 className="font-display text-xl font-semibold">Resumen</h2>
        <div>
          <label className="label" htmlFor="coupon">Cupón de descuento</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input id="coupon" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="input !pl-9 uppercase" placeholder="CÓDIGO" maxLength={30} />
            </div>
            <button onClick={validate} disabled={checking || !code.trim()} className="btn btn-ghost !px-4">Aplicar</button>
          </div>
          {coupon && <p className={`mt-2 text-xs ${coupon.valid ? "text-emerald-300" : "text-rose-300"}`}>{coupon.message}</p>}
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-zinc-400">Subtotal</dt><dd className="font-mono">{formatPEN(subtotal)}</dd></div>
          {discount > 0 && <div className="flex justify-between text-emerald-300"><dt>Descuento ({coupon?.code})</dt><dd className="font-mono">−{formatPEN(discount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-zinc-400">Envío</dt><dd className="text-zinc-400">Se calcula en el checkout</dd></div>
        </dl>
        {remaining > 0 ? (
          <p className="rounded-xl bg-cyan-400/[0.07] p-3 text-xs text-cyan-100">Te faltan {formatPEN(remaining)} para envío estándar gratis.</p>
        ) : (
          <p className="rounded-xl bg-emerald-400/[0.07] p-3 text-xs text-emerald-200">¡Tienes envío estándar gratis!</p>
        )}
        <div className="flex items-baseline justify-between border-t border-white/10 pt-4">
          <span className="text-zinc-400">Total estimado</span>
          <span className="font-display text-2xl font-semibold">{formatPEN(subtotal - discount)}</span>
        </div>
        <Link href="/checkout" className="btn btn-primary w-full !py-3.5">
          Continuar compra <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-center text-xs text-zinc-500">El total final se valida en el servidor al confirmar el pedido.</p>
      </aside>
    </div>
  );
}
