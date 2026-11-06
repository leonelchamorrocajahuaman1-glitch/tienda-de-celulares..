"use client";

import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { discountPercent, formatPEN } from "@/lib/format";
import { defaultVariant, imagesForColor, uniqueColors, variantLabel } from "@/lib/product-helpers";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const dv = defaultVariant(product);
  const colors = uniqueColors(product);
  const [color, setColor] = useState(dv?.color_name ?? colors[0]?.name);
  const variant =
    product.variants.find((v) => v.color_name === color && v.stock > 0) ??
    product.variants.find((v) => v.color_name === color) ??
    dv;
  const imgs = imagesForColor(product, color);
  const img = imgs[0]?.url;
  const imgAlt = imgs[1]?.url;
  const stock = product.variants.reduce((s, v) => s + v.stock, 0);
  const pct = variant ? discountPercent(variant.price, variant.compare_at_price) : 0;
  const add = useCart((s) => s.add);

  // Microinteracción: inclinación 3D sutil + brillo que sigue al cursor.
  // Solo se activa con mouse y mientras el cursor está encima (no crea capas 3D permanentes).
  const card = useRef<HTMLElement>(null);
  const resetTilt = () => {
    const el = card.current;
    if (!el) return;
    el.style.transform = "";
    el.style.removeProperty("--glow");
  };

  return (
    <article
      ref={card}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !card.current) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const r = card.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.current.style.transform = `perspective(900px) rotateX(${(-(py - 0.5) * 6).toFixed(2)}deg) rotateY(${((px - 0.5) * 6).toFixed(2)}deg)`;
        card.current.style.setProperty(
          "--glow",
          `radial-gradient(420px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(34,211,238,0.12), transparent 45%)`,
        );
      }}
      onPointerLeave={resetTilt}
      className="group card relative flex flex-col overflow-hidden p-4 transition-[transform,border-color] duration-300 ease-out hover:border-white/15"
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--glow, none)" }} />
      <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-1.5">
        {product.is_new && (
          <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 font-mono text-[0.6rem] tracking-widest text-cyan-300 ring-1 ring-cyan-400/30">
            NUEVO
          </span>
        )}
        {pct > 0 && (
          <span className="rounded-full bg-violet-500/15 px-2.5 py-1 font-mono text-[0.6rem] tracking-widest text-violet-300 ring-1 ring-violet-400/30">
            -{pct}%
          </span>
        )}
        {stock === 0 && (
          <span className="rounded-full bg-zinc-500/15 px-2.5 py-1 font-mono text-[0.6rem] tracking-widest text-zinc-300 ring-1 ring-zinc-400/30">
            AGOTADO
          </span>
        )}
      </div>
      <Link href={`/producto/${product.slug}`} className="relative block aspect-[4/5] overflow-hidden rounded-2xl" aria-label={product.name}>
        <div className="absolute inset-x-6 bottom-6 h-10 rounded-full bg-cyan-400/10 blur-2xl transition-opacity duration-500 group-hover:bg-cyan-400/25" />
        {img && (
          <Image
            src={img}
            alt={imgs[0].alt || product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
            className={cn(
              "object-contain p-4 transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]",
              imgAlt && "group-hover:opacity-0",
            )}
          />
        )}
        {imgAlt && (
          <Image
            src={imgAlt}
            alt=""
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
            className="object-contain p-4 opacity-0 transition-all duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04] group-hover:opacity-100"
          />
        )}
      </Link>
      <div className="relative mt-4 flex flex-1 flex-col">
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-zinc-500">{product.brand.name}</p>
        <Link href={`/producto/${product.slug}`} className="mt-1 font-display text-lg font-semibold leading-tight hover:text-cyan-200">
          {product.name}
        </Link>
        <p className="mt-1 line-clamp-1 text-sm text-zinc-400">{product.tagline}</p>
        <div className="mt-3 flex items-center gap-1.5" role="radiogroup" aria-label="Color">
          {colors.map((c) => (
            <button
              key={c.name}
              role="radio"
              aria-checked={c.name === color}
              aria-label={c.name}
              title={c.name}
              onClick={() => setColor(c.name)}
              className={cn(
                "h-4 w-4 rounded-full ring-1 ring-white/25 transition",
                c.name === color && "ring-2 ring-cyan-300 ring-offset-2 ring-offset-ink-900",
              )}
              style={{ background: c.hex }}
            />
          ))}
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            {variant?.compare_at_price && pct > 0 && (
              <p className="font-mono text-xs text-zinc-500 line-through">{formatPEN(variant.compare_at_price)}</p>
            )}
            <p className="font-display text-xl font-semibold">{variant ? formatPEN(variant.price) : "—"}</p>
          </div>
          <button
            disabled={!variant || variant.stock === 0}
            onClick={() =>
              variant &&
              add({
                variantId: variant.id,
                productId: product.id,
                slug: product.slug,
                name: product.name,
                brand: product.brand.name,
                variantLabel: variantLabel(variant),
                colorHex: variant.color_hex,
                image: img ?? null,
                unitPrice: variant.price,
                compareAt: variant.compare_at_price,
                maxStock: variant.stock,
              })
            }
            className="grid h-11 w-11 place-items-center rounded-full bg-white/[0.06] text-white ring-1 ring-white/10 transition hover:bg-gradient-to-br hover:from-electric hover:to-cyan-500 disabled:opacity-30"
            aria-label={`Agregar ${product.name} al carrito`}
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </article>
  );
}
