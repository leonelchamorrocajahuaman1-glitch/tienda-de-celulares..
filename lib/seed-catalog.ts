import {
  RENDER_VIEWS,
  SEED_BRANDS,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  renderPath,
  slugify,
} from "@/lib/catalog-data";
import type { Brand, Category, Product } from "@/lib/types";
import { stableId } from "@/lib/utils";

export const seedBrands: Brand[] = SEED_BRANDS.map((b) => ({
  id: stableId(`brand:${b.slug}`),
  name: b.name,
  slug: b.slug,
  description: b.description,
}));

export const seedCategories: Category[] = SEED_CATEGORIES.map((c) => ({
  id: stableId(`category:${c.slug}`),
  name: c.name,
  slug: c.slug,
  description: c.description,
}));

const VIEW_LABEL = { front: "vista frontal", back: "vista posterior", side: "vista lateral" } as const;

/** Catálogo semilla en el mismo formato que devuelve Supabase. */
export const seedProducts: Product[] = SEED_PRODUCTS.map((p) => {
  const brand = seedBrands.find((b) => b.slug === p.brand)!;
  const category = seedCategories.find((c) => c.slug === p.category) ?? null;
  const cheapest = [...p.configs].sort((a, b) => a.price - b.price)[0];
  let position = 0;
  const variants = p.colors.flatMap((color, ci) =>
    p.configs.map((cfg, ki) => {
      const sku = `${p.slug}-${slugify(color.name)}-${cfg.ram}-${cfg.storage}`.toUpperCase().slice(0, 60);
      // Distribución determinista del stock entre variantes
      const stock = p.stock === 0 ? 0 : Math.max(0, p.stock - ci * 2 - ki * 3);
      return {
        id: stableId(`variant:${sku}`),
        sku,
        color_name: color.name,
        color_hex: color.hex,
        ram_gb: cfg.ram,
        storage_gb: cfg.storage,
        price: cfg.price,
        compare_at_price: cfg.compare ?? null,
        is_default: ci === 0 && cfg === cheapest,
        is_active: true,
        position: position++,
        stock,
        low_stock_threshold: 5,
      };
    }),
  );
  let imgPos = 0;
  const images = p.colors.flatMap((color) =>
    RENDER_VIEWS.map((view) => ({
      id: stableId(`image:${p.slug}:${color.name}:${view}`),
      url: renderPath(p.slug, color.name, view),
      alt: `${p.name} ${color.name} — ${VIEW_LABEL[view]}`,
      color_name: color.name,
      position: imgPos++,
    })),
  );
  return {
    id: stableId(`product:${p.slug}`),
    slug: p.slug,
    name: p.name,
    model: p.model,
    tagline: p.tagline,
    description: p.description,
    processor: p.processor,
    ram_gb: cheapest.ram,
    storage_gb: cheapest.storage,
    display: p.display,
    camera: p.camera,
    battery: p.battery,
    os: p.os,
    extra_specs: p.extra ?? {},
    base_price: cheapest.price,
    compare_at_price: cheapest.compare ?? null,
    model_url: null,
    model_preset: p.preset,
    is_active: true,
    is_featured: Boolean(p.featured),
    is_new: Boolean(p.isNew),
    is_bestseller: Boolean(p.bestseller),
    sold_count: p.soldCount ?? 0,
    release_date: p.releaseDate,
    brand,
    category,
    variants,
    images,
  };
});
