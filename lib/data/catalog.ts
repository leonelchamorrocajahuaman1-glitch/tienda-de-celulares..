import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { seedBrands, seedCategories, seedProducts } from "@/lib/seed-catalog";
import { getPublicSupabase } from "@/lib/supabase/server";
import type { Brand, Category, Product, StoreSettings, Variant } from "@/lib/types";

export const PRODUCT_SELECT = `
  id, slug, name, model, tagline, description, processor, ram_gb, storage_gb, display, camera,
  battery, os, extra_specs, base_price, compare_at_price, model_url, model_preset, is_active,
  is_featured, is_new, is_bestseller, sold_count, release_date,
  brand:brands(id, name, slug, description),
  category:categories(id, name, slug, description),
  variants:product_variants(id, sku, color_name, color_hex, ram_gb, storage_gb, price, compare_at_price,
    is_default, is_active, position, inventory(stock, low_stock_threshold)),
  images:product_images(id, url, alt, color_name, position)
`;

type Row = Record<string, unknown>;

/** Normaliza una fila de Supabase al tipo Product. */
export function mapProduct(row: Row): Product {
  const variants = ((row.variants as Row[]) ?? [])
    .map((v): Variant => {
      const inv = Array.isArray(v.inventory) ? (v.inventory[0] as Row | undefined) : (v.inventory as Row | null);
      return {
        id: String(v.id),
        sku: String(v.sku),
        color_name: String(v.color_name),
        color_hex: String(v.color_hex),
        ram_gb: Number(v.ram_gb),
        storage_gb: Number(v.storage_gb),
        price: Number(v.price),
        compare_at_price: v.compare_at_price == null ? null : Number(v.compare_at_price),
        is_default: Boolean(v.is_default),
        is_active: Boolean(v.is_active),
        position: Number(v.position ?? 0),
        stock: Number(inv?.stock ?? 0),
        low_stock_threshold: Number(inv?.low_stock_threshold ?? 5),
      };
    })
    .sort((a, b) => a.position - b.position);
  const images = ((row.images as Row[]) ?? [])
    .map((i) => ({
      id: String(i.id),
      url: String(i.url),
      alt: String(i.alt ?? ""),
      color_name: (i.color_name as string | null) ?? null,
      position: Number(i.position ?? 0),
    }))
    .sort((a, b) => a.position - b.position);
  return {
    ...(row as unknown as Product),
    base_price: Number(row.base_price),
    compare_at_price: row.compare_at_price == null ? null : Number(row.compare_at_price),
    extra_specs: (row.extra_specs as Record<string, string>) ?? {},
    brand: row.brand as Brand,
    category: (row.category as Category | null) ?? null,
    variants,
    images,
  };
}

const fetchAllProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const sb = getPublicSupabase();
    if (!sb) return seedProducts;
    const { data, error } = await sb
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Error al cargar catálogo: ${error.message}`);
    return (data ?? []).map((r) => mapProduct(r as Row)).map((p) => ({
      ...p,
      variants: p.variants.filter((v) => v.is_active),
    }));
  },
  ["catalog-all"],
  { revalidate: 60, tags: ["catalog"] },
);

export const getAllProducts = cache(fetchAllProducts);

export const getBrands = cache(
  unstable_cache(
    async (): Promise<Brand[]> => {
      const sb = getPublicSupabase();
      if (!sb) return seedBrands;
      const { data, error } = await sb.from("brands").select("id, name, slug, description").order("position");
      if (error) throw new Error(error.message);
      return (data ?? []) as Brand[];
    },
    ["brands"],
    { revalidate: 300, tags: ["catalog"] },
  ),
);

export const getCategories = cache(
  unstable_cache(
    async (): Promise<Category[]> => {
      const sb = getPublicSupabase();
      if (!sb) return seedCategories;
      const { data, error } = await sb.from("categories").select("id, name, slug, description").order("position");
      if (error) throw new Error(error.message);
      return (data ?? []) as Category[];
    },
    ["categories"],
    { revalidate: 300, tags: ["catalog"] },
  ),
);

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: "NEXPHONE",
  legal_name: "NEXPHONE S.A.C.",
  ruc: "",
  email: "contacto@nexphone.pe",
  phone: "",
  whatsapp: "",
  address: "Lima, Perú",
  business_hours: "Lun–Sáb 10:00–20:00",
  shipping_standard: 15,
  shipping_express: 29,
  free_shipping_from: 1500,
  bank_details: "",
  announcement: "",
};

export const getStoreSettings = cache(
  unstable_cache(
    async (): Promise<StoreSettings> => {
      const sb = getPublicSupabase();
      if (!sb) return DEFAULT_SETTINGS;
      const { data } = await sb.from("store_settings").select("*").eq("id", 1).maybeSingle();
      if (!data) return DEFAULT_SETTINGS;
      return {
        ...DEFAULT_SETTINGS,
        ...data,
        shipping_standard: Number(data.shipping_standard),
        shipping_express: Number(data.shipping_express),
        free_shipping_from: Number(data.free_shipping_from),
      };
    },
    ["store-settings"],
    { revalidate: 120, tags: ["settings"] },
  ),
);

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await getAllProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

// ---------- Utilidades de producto ----------
export function productStock(p: Product): number {
  return p.variants.reduce((s, v) => s + v.stock, 0);
}
export function minPrice(p: Product): number {
  return p.variants.length ? Math.min(...p.variants.map((v) => v.price)) : p.base_price;
}
export function hasOffer(p: Product): boolean {
  return p.variants.some((v) => v.compare_at_price != null && v.compare_at_price > v.price);
}

export interface CatalogFilters {
  q?: string;
  brands?: string[];
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  ram?: number[];
  storage?: number[];
  available?: boolean;
  offers?: boolean;
  sort?: "relevance" | "price-asc" | "price-desc" | "newest" | "bestsellers";
}

export function filterProducts(products: Product[], f: CatalogFilters): Product[] {
  const q = f.q?.trim().toLowerCase();
  let list = products.filter((p) => {
    if (q && !`${p.name} ${p.brand.name} ${p.model} ${p.processor}`.toLowerCase().includes(q)) return false;
    if (f.brands?.length && !f.brands.includes(p.brand.slug)) return false;
    if (f.category && p.category?.slug !== f.category) return false;
    const vs = p.variants.filter(
      (v) =>
        (!f.ram?.length || f.ram.includes(v.ram_gb)) &&
        (!f.storage?.length || f.storage.includes(v.storage_gb)) &&
        (f.minPrice == null || v.price >= f.minPrice) &&
        (f.maxPrice == null || v.price <= f.maxPrice) &&
        (!f.available || v.stock > 0) &&
        (!f.offers || (v.compare_at_price != null && v.compare_at_price > v.price)),
    );
    return vs.length > 0;
  });
  switch (f.sort) {
    case "price-asc":
      list = [...list].sort((a, b) => minPrice(a) - minPrice(b));
      break;
    case "price-desc":
      list = [...list].sort((a, b) => minPrice(b) - minPrice(a));
      break;
    case "newest":
      list = [...list].sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
      break;
    case "bestsellers":
      list = [...list].sort((a, b) => b.sold_count - a.sold_count);
      break;
    default:
      list = [...list].sort(
        (a, b) => Number(b.is_featured) - Number(a.is_featured) || b.sold_count - a.sold_count,
      );
  }
  return list;
}

export const isPreviewCatalog = !isSupabaseConfigured;
