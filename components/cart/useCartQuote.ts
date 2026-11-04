"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";

/**
 * Refresca precio y stock vigentes del carrito desde el servidor.
 * Si un precio cambió o el stock bajó, actualiza el carrito y lo informa.
 */
export function useCartQuote() {
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const [notice, setNotice] = useState<string | null>(null);
  const ids = items.map((i) => i.variantId).sort().join(",");

  useEffect(() => {
    if (!hydrated || !ids) return;
    let cancelled = false;
    fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ids.split(",") }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const v = data.variants as Record<string, { price: number; compareAt: number | null; stock: number; active: boolean }>;
        const current = useCart.getState().items;
        const changes: string[] = [];
        const next = current
          .filter((i) => {
            const q = v[i.variantId];
            if (q && (!q.active || q.stock === 0)) {
              changes.push(`${i.name} ya no está disponible y se retiró del carrito.`);
              return false;
            }
            return true;
          })
          .map((i) => {
            const q = v[i.variantId];
            if (!q) return i;
            let quantity = i.quantity;
            if (q.price !== i.unitPrice) changes.push(`El precio de ${i.name} se actualizó.`);
            if (quantity > q.stock) {
              quantity = q.stock;
              changes.push(`Ajustamos la cantidad de ${i.name} al stock disponible (${q.stock}).`);
            }
            return { ...i, unitPrice: q.price, compareAt: q.compareAt, maxStock: q.stock, quantity };
          });
        if (changes.length) {
          useCart.getState().replace(next);
          setNotice(changes.join(" "));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ids, hydrated]);

  return notice;
}
