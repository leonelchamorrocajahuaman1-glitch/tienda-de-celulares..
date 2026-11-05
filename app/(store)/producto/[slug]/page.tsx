import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { ProductCard } from "@/components/store/ProductCard";
import { getAllProducts, getProductBySlug, minPrice, productStock } from "@/lib/data/catalog";
import { siteUrl } from "@/lib/env";
import { primaryImage } from "@/lib/product-helpers";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const products = await getAllProducts();
    return products.map((p) => ({ slug: p.slug }));
  } catch (e) {
    // Si la BD no responde durante el build, las fichas se generan bajo demanda
    console.warn("[build] catálogo no disponible para prerender:", (e as Error).message);
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Producto no encontrado" };
  const img = primaryImage(p);
  return {
    title: `${p.name} — ${p.brand.name}`,
    description: p.tagline ?? p.description.slice(0, 160),
    openGraph: { images: img ? [{ url: img }] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const all = await getAllProducts();
  const related = all
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      p,
      score:
        (p.brand.id === product.brand.id ? 2 : 0) +
        (p.category?.id === product.category?.id ? 1 : 0) +
        (Math.abs(minPrice(p) - minPrice(product)) < 1200 ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((r) => r.p);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand.name },
    model: product.model,
    description: product.description,
    image: product.images.slice(0, 3).map((i) => (i.url.startsWith("http") ? i.url : `${siteUrl()}${i.url}`)),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PEN",
      lowPrice: minPrice(product),
      highPrice: Math.max(...product.variants.map((v) => v.price)),
      availability: productStock(product) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-6 pt-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-8 text-sm text-zinc-500" aria-label="Ruta">
        <Link href="/" className="hover:text-white">Inicio</Link> <span className="mx-1.5">/</span>
        <Link href="/catalogo" className="hover:text-white">Catálogo</Link> <span className="mx-1.5">/</span>
        <Link href={`/catalogo?brand=${product.brand.slug}`} className="hover:text-white">{product.brand.name}</Link>
        <span className="mx-1.5">/</span> <span className="text-zinc-300">{product.name}</span>
      </nav>
      <ProductDetail product={product} />
      {related.length > 0 && (
        <section className="mt-28">
          <p className="eyebrow">También te puede interesar</p>
          <h2 className="mb-8 mt-3 font-display text-3xl font-semibold">Productos relacionados</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
