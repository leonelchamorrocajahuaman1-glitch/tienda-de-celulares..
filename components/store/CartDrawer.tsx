"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { QtyStepper } from "@/components/store/QtyStepper";
import { MAX_QTY, cartSubtotal, useCart } from "@/lib/cart-store";
import { formatPEN } from "@/lib/format";

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove } = useCart();
  const subtotal = cartSubtotal(items);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, setOpen]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Carrito de compras"
            className="glass-strong fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div>
                <p className="eyebrow">Tu selección</p>
                <h2 className="font-display text-xl font-semibold">Carrito</h2>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Cerrar carrito">
                <X className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5">
                  <ShoppingBag className="h-7 w-7 text-cyan-300" />
                </div>
                <p className="text-zinc-400">Tu carrito está vacío.</p>
                <Link href="/catalogo" onClick={() => setOpen(false)} className="btn btn-primary">
                  Explorar colección
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-3 overflow-y-auto px-6 py-5">
                  <AnimatePresence initial={false}>
                    {items.map((it) => (
                      <motion.li
                        key={it.variantId}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 40 }}
                        className="card flex gap-4 p-3"
                      >
                        <Link
                          href={`/producto/${it.slug}`}
                          onClick={() => setOpen(false)}
                          className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-b from-white/[0.06] to-transparent"
                        >
                          {it.image && <Image src={it.image} alt={it.name} fill sizes="80px" className="object-contain p-1" />}
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="text-[0.7rem] uppercase tracking-widest text-zinc-500">{it.brand}</p>
                          <p className="truncate font-medium">{it.name}</p>
                          <p className="flex items-center gap-1.5 truncate text-xs text-zinc-400">
                            <span className="h-2.5 w-2.5 rounded-full ring-1 ring-white/30" style={{ background: it.colorHex }} />
                            {it.variantLabel}
                          </p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <QtyStepper
                              size="sm"
                              value={it.quantity}
                              max={Math.min(MAX_QTY, it.maxStock)}
                              onChange={(v) => setQty(it.variantId, v)}
                            />
                            <span className="font-mono text-sm">{formatPEN(it.unitPrice * it.quantity)}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => remove(it.variantId)}
                          className="self-start rounded-full p-1.5 text-zinc-500 hover:bg-white/10 hover:text-rose-300"
                          aria-label={`Eliminar ${it.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <div className="space-y-4 border-t border-white/10 px-6 py-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-zinc-400">Subtotal</span>
                    <span className="font-display text-2xl font-semibold">{formatPEN(subtotal)}</span>
                  </div>
                  <p className="text-xs text-zinc-500">Envío, cupones y total final se calculan en el checkout.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/carrito" onClick={() => setOpen(false)} className="btn btn-ghost">
                      Ver carrito
                    </Link>
                    <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-primary">
                      Comprar
                    </Link>
                  </div>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
