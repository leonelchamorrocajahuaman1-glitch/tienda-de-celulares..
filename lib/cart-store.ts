"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  variantLabel: string;
  colorHex: string;
  image: string | null;
  /** Precio mostrado (referencial). El total real se recalcula en el servidor. */
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  maxStock: number;
}

export const MAX_QTY = 10;

interface CartState {
  items: CartItem[];
  open: boolean;
  hydrated: boolean;
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
  replace: (items: CartItem[]) => void;
  setOpen: (open: boolean) => void;
}

const clampQty = (q: number, max: number) => Math.max(1, Math.min(q, MAX_QTY, Math.max(max, 1)));

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      hydrated: false,
      add: (item, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              open: true,
              items: s.items.map((i) =>
                i.variantId === item.variantId
                  ? { ...i, ...item, quantity: clampQty(i.quantity + qty, item.maxStock) }
                  : i,
              ),
            };
          }
          return { open: true, items: [...s.items, { ...item, quantity: clampQty(qty, item.maxStock) }] };
        }),
      setQty: (variantId, qty) =>
        set((s) => ({
          items: s.items.map((i) => (i.variantId === variantId ? { ...i, quantity: clampQty(qty, i.maxStock) } : i)),
        })),
      remove: (variantId) => set((s) => ({ items: s.items.filter((i) => i.variantId !== variantId) })),
      clear: () => set({ items: [] }),
      replace: (items) => set({ items }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "nexphone-cart",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => () => {
        useCart.setState({ hydrated: true });
      },
    },
  ),
);

export function cartSubtotal(items: CartItem[]) {
  return items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
}
export function cartCount(items: CartItem[]) {
  return items.reduce((s, i) => s + i.quantity, 0);
}
