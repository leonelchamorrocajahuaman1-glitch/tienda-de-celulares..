"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Box, Check, Image as ImageIcon, Minus, Plus, RotateCw, ShieldCheck, ShoppingBag, Truck, ZoomIn, ZoomOut } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import { QtyStepper } from "@/components/store/QtyStepper";
import type { ViewName } from "@/components/three/ProductViewer";
import { usePrefersReducedMotion, useWebGLSupport } from "@/components/three/useWebGL";
import { MAX_QTY, useCart } from "@/lib/cart-store";
import { discountPercent, formatPEN, formatStorage } from "@/lib/format";
import { defaultVariant, imagesForColor, uniqueColors, variantLabel } from "@/lib/product-helpers";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const ProductViewer = dynamic(() => import("@/components/three/ProductViewer"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-3xl" />,
});

export function ProductDetail({ product }: { product: Product }) {
  const dv = defaultVariant(product);
  const colors = uniqueColors(product);
  const [color, setColor] = useState(dv?.color_name ?? colors[0]?.name ?? "");
  const configsFor = (c: string) => product.variants.filter((v) => v.color_name === c);
  const [variantId, setVariantId] = useState(dv?.id ?? "");
  const variant = product.variants.find((v) => v.id === variantId) ?? dv;
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState<"3d" | "photos">("3d");
  const [imgIdx, setImgIdx] = useState(0);
  const [view, setView] = useState<ViewName>("front");
  const [viewNonce, setViewNonce] = useState(0);
  const [zoom, setZoom] = useState({ n: 0, dir: 1 });
  const [autoRotate, setAutoRotate] = useState(true);
  const [added, setAdded] = useState(false);
  const gl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const add = useCart((s) => s.add);

  const images = useMemo(() => imagesForColor(product, color), [product, color]);
  const show3D = mode === "3d" && gl === "ok";
  const stock = variant?.stock ?? 0;
  const pct = variant ? discountPercent(variant.price, variant.compare_at_price) : 0;
  const lowStock = variant && stock > 0 && stock <= variant.low_stock_threshold;

  const selectColor = (c: string) => {
    setColor(c);
    setImgIdx(0);
    // Mantener la misma configuración RAM/almacenamiento si existe en el nuevo color
    const same = configsFor(c).find((v) => v.ram_gb === variant?.ram_gb && v.storage_gb === variant?.storage_gb);
    const next = same ?? configsFor(c).find((v) => v.stock > 0) ?? configsFor(c)[0];
    if (next) setVariantId(next.id);
    setQty(1);
  };

  const goView = (v: ViewName) => {
    setView(v);
    setViewNonce((n) => n + 1);
    setAutoRotate(false);
  };

  const onAdd = () => {
    if (!variant || stock === 0) return;
    add(
      {
        variantId: variant.id,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        brand: product.brand.name,
        variantLabel: variantLabel(variant),
        colorHex: variant.color_hex,
        image: images[0]?.url ?? null,
        unitPrice: variant.price,
        compareAt: variant.compare_at_price,
        maxStock: stock,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      {/* Visor */}
      <div className="lg:sticky lg:top-28 lg:self-start">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/[0.07] bg-[radial-gradient(ellipse_at_50%_35%,rgba(47,107,255,0.18),transparent_60%),radial-gradient(ellipse_at_80%_90%,rgba(139,92,246,0.14),transparent_55%)] sm:aspect-square">
          {show3D ? (
            <ProductViewer
              color={variant?.color_hex ?? "#888888"}
              preset={product.model_preset}
              modelUrl={product.model_url}
              view={view}
              viewNonce={viewNonce}
              zoomNonce={zoom.n}
              zoomDir={zoom.dir}
              autoRotate={autoRotate}
              reduced={reduced}
              onInteract={() => setAutoRotate(false)}
            />
          ) : (
            <AnimatePresence mode="wait">
              {images[imgIdx] && (
                <motion.div
                  key={images[imgIdx].url}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <Image src={images[imgIdx].url} alt={images[imgIdx].alt || product.name} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-contain p-8" />
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Controles */}
          <div className="absolute left-4 top-4 flex gap-1 rounded-full bg-black/40 p-1 backdrop-blur">
            <button
              onClick={() => setMode("3d")}
              disabled={gl !== "ok"}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs", mode === "3d" && gl === "ok" ? "bg-white/15 text-white" : "text-zinc-400")}
              title={gl === "unsupported" ? "Tu dispositivo no admite 3D: mostrando fotografías" : "Vista 3D"}
            >
              <Box className="h-3.5 w-3.5" /> 3D
            </button>
            <button
              onClick={() => setMode("photos")}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs", !show3D ? "bg-white/15 text-white" : "text-zinc-400")}
            >
              <ImageIcon className="h-3.5 w-3.5" /> Fotos
            </button>
          </div>
          {show3D && (
            <>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-black/40 p-1 backdrop-blur">
                {(
                  [
                    ["front", "Frente"],
                    ["back", "Atrás"],
                    ["side", "Lateral"],
                  ] as [ViewName, string][]
                ).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => goView(v)}
                    className={cn("rounded-full px-3.5 py-1.5 text-xs transition", view === v && !autoRotate ? "bg-white/15 text-white" : "text-zinc-300 hover:text-white")}
                  >
                    {l}
                  </button>
                ))}
                <button
                  onClick={() => setAutoRotate((a) => !a)}
                  className={cn("flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs", autoRotate ? "bg-cyan-400/20 text-cyan-200" : "text-zinc-300")}
                  aria-pressed={autoRotate}
                >
                  <RotateCw className="h-3.5 w-3.5" /> 360°
                </button>
              </div>
              <div className="absolute right-4 top-4 flex flex-col gap-1 rounded-full bg-black/40 p-1 backdrop-blur">
                <button onClick={() => setZoom((z) => ({ n: z.n + 1, dir: 1 }))} className="rounded-full p-2 text-zinc-300 hover:bg-white/10" aria-label="Acercar">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button onClick={() => setZoom((z) => ({ n: z.n + 1, dir: -1 }))} className="rounded-full p-2 text-zinc-300 hover:bg-white/10" aria-label="Alejar">
                  <ZoomOut className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
        {/* Galería */}
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={() => {
                setMode("photos");
                setImgIdx(i);
              }}
              className={cn(
                "relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-white/[0.03] transition",
                !show3D && imgIdx === i ? "border-cyan-400/70" : "border-white/10 hover:border-white/25",
              )}
              aria-label={`Ver foto ${i + 1}: ${im.alt}`}
            >
              <Image src={im.url} alt="" fill sizes="80px" className="object-contain p-1.5" />
            </button>
          ))}
        </div>
      </div>

      {/* Información */}
      <div>
        <p className="eyebrow">{product.brand.name}</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{product.name}</h1>
        {product.tagline && <p className="mt-3 text-lg text-zinc-400">{product.tagline}</p>}

        <div className="mt-6 flex flex-wrap items-end gap-3">
          <p className="font-display text-4xl font-semibold">{variant ? formatPEN(variant.price) : "—"}</p>
          {variant?.compare_at_price && pct > 0 && (
            <>
              <p className="pb-1 font-mono text-zinc-500 line-through">{formatPEN(variant.compare_at_price)}</p>
              <span className="mb-1.5 rounded-full bg-violet-500/15 px-2.5 py-1 font-mono text-xs text-violet-300 ring-1 ring-violet-400/30">
                Ahorras {formatPEN(variant.compare_at_price - variant.price)} (-{pct}%)
              </span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-zinc-500">Precio en soles, IGV incluido.</p>

        {/* Color */}
        <div className="mt-8">
          <p className="label">
            Color: <span className="text-white">{color}</span>
          </p>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Color">
            {colors.map((c) => {
              const available = configsFor(c.name).some((v) => v.stock > 0);
              return (
                <button
                  key={c.name}
                  role="radio"
                  aria-checked={c.name === color}
                  onClick={() => selectColor(c.name)}
                  title={`${c.name}${available ? "" : " (agotado)"}`}
                  className={cn(
                    "relative h-10 w-10 rounded-full ring-1 ring-white/25 transition hover:scale-105",
                    c.name === color && "ring-2 ring-cyan-300 ring-offset-4 ring-offset-ink-950",
                    !available && "opacity-40",
                  )}
                  style={{ background: `radial-gradient(circle at 30% 30%, ${c.hex}, ${c.hex} 45%, #000 140%)` }}
                >
                  <span className="sr-only">{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Configuración */}
        <div className="mt-7">
          <p className="label">Memoria y almacenamiento</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {configsFor(color).map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setVariantId(v.id);
                  setQty(1);
                }}
                aria-pressed={v.id === variant?.id}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                  v.id === variant?.id ? "border-cyan-400/60 bg-cyan-400/[0.07]" : "border-white/10 hover:border-white/25",
                  v.stock === 0 && "opacity-50",
                )}
              >
                <span>
                  <span className="block text-sm font-medium">{formatStorage(v.storage_gb)}</span>
                  <span className="text-xs text-zinc-400">{v.ram_gb} GB RAM{v.stock === 0 ? " · Agotado" : ""}</span>
                </span>
                <span className="font-mono text-sm">{formatPEN(v.price)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Disponibilidad */}
        <div className="mt-6 flex items-center gap-2 text-sm" aria-live="polite">
          <span className={cn("h-2 w-2 rounded-full", stock === 0 ? "bg-zinc-500" : lowStock ? "bg-amber-400" : "bg-emerald-400")} />
          {stock === 0 ? (
            <span className="text-zinc-400">Agotado en esta configuración</span>
          ) : lowStock ? (
            <span className="text-amber-300">¡Últimas {stock} unidades!</span>
          ) : (
            <span className="text-emerald-300">En stock · {stock} disponibles</span>
          )}
          {variant && <span className="ml-auto font-mono text-xs text-zinc-500">SKU {variant.sku}</span>}
        </div>

        {/* Compra */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <QtyStepper value={qty} max={Math.max(1, Math.min(MAX_QTY, stock))} onChange={(v) => setQty(Math.max(1, Math.min(v, MAX_QTY, stock)))} />
          <button onClick={onAdd} disabled={stock === 0} className="btn btn-primary flex-1 !py-3.5">
            <AnimatePresence mode="wait" initial={false}>
              {added ? (
                <motion.span key="ok" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="flex items-center gap-2">
                  <Check className="h-4 w-4" /> Agregado
                </motion.span>
              ) : (
                <motion.span key="add" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> {stock === 0 ? "Agotado" : "Agregar al carrito"}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
        {variant && stock > 0 && (
          <p className="mt-3 text-sm text-zinc-400">
            Subtotal: <span className="font-mono text-white">{formatPEN(variant.price * qty)}</span>
          </p>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <div className="glass flex gap-3 rounded-2xl p-4 text-sm">
            <Truck className="h-5 w-5 shrink-0 text-cyan-300" />
            <span className="text-zinc-300">Envío a todo el Perú · Express Lima 24 h</span>
          </div>
          <div className="glass flex gap-3 rounded-2xl p-4 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-cyan-300" />
            <span className="text-zinc-300">Equipo original con garantía oficial</span>
          </div>
        </div>

        <p className="mt-10 leading-relaxed text-zinc-300">{product.description}</p>

        <SpecTable product={product} variantRam={variant?.ram_gb} variantStorage={variant?.storage_gb} />
      </div>
    </div>
  );
}

function SpecTable({ product, variantRam, variantStorage }: { product: Product; variantRam?: number; variantStorage?: number }) {
  const [open, setOpen] = useState(true);
  const rows: [string, string][] = [
    ["Marca", product.brand.name],
    ["Modelo", product.model],
    ["Procesador", product.processor],
    ["Memoria RAM", `${variantRam ?? product.ram_gb} GB`],
    ["Almacenamiento", formatStorage(variantStorage ?? product.storage_gb)],
    ["Pantalla", product.display],
    ["Cámara", product.camera],
    ["Batería", product.battery],
    ["Sistema operativo", product.os],
    ...Object.entries(product.extra_specs ?? {}),
  ];
  return (
    <section className="mt-10 border-t border-white/10 pt-6">
      <button className="flex w-full items-center justify-between" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <h2 className="font-display text-xl font-semibold">Especificaciones técnicas</h2>
        {open ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.dl
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-4 overflow-hidden"
          >
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-[140px_1fr] gap-4 border-b border-white/[0.06] py-3 text-sm sm:grid-cols-[180px_1fr]">
                  <dt className="text-zinc-500">{k}</dt>
                  <dd className="text-zinc-200">{v}</dd>
                </div>
              ))}
          </motion.dl>
        )}
      </AnimatePresence>
    </section>
  );
}
