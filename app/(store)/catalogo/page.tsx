import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogFilters, SortSelect } from "@/components/catalog/CatalogFilters";
import { ProductCard } from "@/components/store/ProductCard";
import { type CatalogFilters as F, filterProducts, getAllProducts, getBrands, getCategories } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Catálogo de smartphones",
  description: "Apple, Samsung, Xiaomi, Motorola, Honor, Huawei, Google Pixel, OnePlus y Realme al mejor precio en soles.",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const nums = (v: string | undefined) =>
  (v ?? "").split(",").map(Number).filter((n) => Number.isFinite(n) && n > 0);
const SORTS = ["relevance", "price-asc", "price-desc", "newest", "bestsellers"] as const;

export default async function CatalogPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const [products, brands, categories] = await Promise.all([getAllProducts(), getBrands(), getCategories()]);
  const sort = SORTS.find((s) => s === one(sp.sort)) ?? "relevance";
  const min = Number(one(sp.min));
  const max = Number(one(sp.max));
  const filters: F = {
    q: one(sp.q)?.slice(0, 80),
    brands: (one(sp.brand) ?? "").split(",").filter(Boolean),
    category: one(sp.category),
    minPrice: Number.isFinite(min) && min > 0 ? min : undefined,
    maxPrice: Number.isFinite(max) && max > 0 ? max : undefined,
    ram: nums(one(sp.ram)),
    storage: nums(one(sp.storage)),
    available: one(sp.available) === "1",
    offers: one(sp.offers) === "1",
    sort,
  };
  const list = filterProducts(products, filters);
  const allVariants = products.flatMap((p) => p.variants);
  const prices = allVariants.map((v) => v.price);
  const activeBrand = filters.brands?.length === 1 ? brands.find((b) => b.slug === filters.brands![0]) : null;
  const activeCategory = categories.find((c) => c.slug === filters.category);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-10 pt-32">
      <div className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-br from-electric/15 via-ink-850 to-violet/15 px-8 py-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
        <p className="eyebrow">Catálogo</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {filters.q ? `Resultados para “${filters.q}”` : activeBrand?.name ?? activeCategory?.name ?? (filters.offers ? "Ofertas especiales" : "Todos los smartphones")}
        </h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          {activeBrand?.description ?? activeCategory?.description ?? "Equipos originales con garantía oficial. Precios en soles con IGV incluido."}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[250px_1fr]">
        <Suspense>
          <CatalogFilters
            brands={brands.map((b) => ({ value: b.slug, label: b.name, count: products.filter((p) => p.brand.slug === b.slug).length }))}
            categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
            rams={[...new Set(allVariants.map((v) => v.ram_gb))].sort((a, b) => a - b)}
            storages={[...new Set(allVariants.map((v) => v.storage_gb))].sort((a, b) => a - b)}
            priceBounds={[prices.length ? Math.min(...prices) : 0, prices.length ? Math.max(...prices) : 0]}
          />
        </Suspense>
        <section aria-label="Productos">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-400" aria-live="polite">
              {list.length} {list.length === 1 ? "producto" : "productos"}
            </p>
            <Suspense>
              <SortSelect value={sort} />
            </Suspense>
          </div>
          {list.length === 0 ? (
            <div className="card grid place-items-center px-6 py-20 text-center">
              <p className="font-display text-xl">No encontramos productos con esos filtros.</p>
              <p className="mt-2 text-sm text-zinc-400">Prueba ampliando el rango de precio o quitando algún filtro.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 3} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
