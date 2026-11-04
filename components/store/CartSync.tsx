"use client";

import { useEffect, useRef } from "react";
import { type CartItem, useCart } from "@/lib/cart-store";

/**
 * Sincroniza el carrito local con Supabase cuando hay sesión:
 * al iniciar sesión se fusionan ambos carritos y luego cada cambio se guarda.
 */
export function CartSync({ loggedIn }: { loggedIn: boolean }) {
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loggedIn || !hydrated || ready.current) return;
    (async () => {
      try {
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (!res.ok) return;
        const { items: remote } = (await res.json()) as { items: CartItem[] };
        const local = useCart.getState().items;
        const map = new Map<string, CartItem>();
        [...remote, ...local].forEach((i) => {
          const prev = map.get(i.variantId);
          map.set(i.variantId, prev ? { ...i, quantity: Math.max(prev.quantity, i.quantity) } : i);
        });
        useCart.getState().replace([...map.values()].filter((i) => i.maxStock > 0));
      } finally {
        ready.current = true;
      }
    })();
  }, [loggedIn, hydrated]);

  useEffect(() => {
    if (!loggedIn || !ready.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })) }),
      }).catch(() => {});
    }, 600);
  }, [items, loggedIn]);

  return null;
}
