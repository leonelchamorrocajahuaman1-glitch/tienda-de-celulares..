import { formatStorage } from "@/lib/format";
import type { Product, Variant } from "@/lib/types";

export function variantLabel(v: Pick<Variant, "color_name" | "ram_gb" | "storage_gb">) {
  return `${v.color_name} · ${v.ram_gb} GB RAM · ${formatStorage(v.storage_gb)}`;
}

export function imagesForColor(p: Pick<Product, "images">, color?: string | null) {
  const own = p.images.filter((i) => i.color_name === color);
  const generic = p.images.filter((i) => !i.color_name);
  const list = own.length ? [...own, ...generic] : generic.length ? generic : p.images;
  return list;
}

export function primaryImage(p: Pick<Product, "images" | "variants">, color?: string | null) {
  const c = color ?? p.variants.find((v) => v.is_default)?.color_name ?? p.variants[0]?.color_name;
  return imagesForColor(p, c)[0]?.url ?? null;
}

export function defaultVariant(p: Product): Variant | undefined {
  return (
    p.variants.find((v) => v.is_default && v.stock > 0) ??
    p.variants.find((v) => v.stock > 0) ??
    p.variants.find((v) => v.is_default) ??
    p.variants[0]
  );
}

export function uniqueColors(p: Product) {
  const seen = new Map<string, string>();
  p.variants.forEach((v) => seen.has(v.color_name) || seen.set(v.color_name, v.color_hex));
  return [...seen.entries()].map(([name, hex]) => ({ name, hex }));
}
