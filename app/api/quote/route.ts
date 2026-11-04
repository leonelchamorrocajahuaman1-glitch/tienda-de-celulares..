import { NextResponse } from "next/server";
import { z } from "zod";
import { getAllProducts } from "@/lib/data/catalog";

/** Devuelve precio y stock vigentes de las variantes del carrito (protección de precios en el cliente). */
const schema = z.object({ ids: z.array(z.string().uuid()).max(30) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const products = await getAllProducts();
  const out: Record<string, { price: number; compareAt: number | null; stock: number; active: boolean }> = {};
  for (const id of parsed.data.ids) {
    const p = products.find((x) => x.variants.some((v) => v.id === id));
    const v = p?.variants.find((x) => x.id === id);
    out[id] = v
      ? { price: v.price, compareAt: v.compare_at_price, stock: v.stock, active: true }
      : { price: 0, compareAt: null, stock: 0, active: false };
  }
  return NextResponse.json({ variants: out });
}
