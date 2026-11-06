import { ArrowRight, BatteryCharging, Camera, Cpu, CreditCard, MonitorSmartphone, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { HeroExperience } from "@/components/home/HeroExperience";
import { Reveal } from "@/components/home/Reveal";
import { ProductCard } from "@/components/store/ProductCard";
import { getAllProducts, getBrands, hasOffer, minPrice } from "@/lib/data/catalog";
import { discountPercent, formatPEN } from "@/lib/format";
import { imagesForColor, uniqueColors } from "@/lib/product-helpers";

export const revalidate = 60;

function SectionHead({ eyebrow, title, href, cta }: { eyebrow: string; title: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div data-reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="group inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
          {cta ?? "Ver todo"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  // Si la BD no responde (p. ej. durante el build), se muestra la portada sin listados y se regenera en 60 s
  const [products, brands] = await Promise.all([getAllProducts().catch(() => []), getBrands().catch(() => [])]);
  const hero = products.find((p) => p.is_featured && p.slug.includes("pro")) ?? products.find((p) => p.is_featured) ?? products[0];
  const bestsellers = [...products].sort((a, b) => b.sold_count - a.sold_count).slice(0, 4);
  const launches = products.filter((p) => p.is_new).sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
  const offers = products
    .filter(hasOffer)
    .map((p) => ({ p, pct: Math.max(...p.variants.map((v) => discountPercent(v.price, v.compare_at_price))) }))
    .sort((a, b) => b.pct - a.pct);
  const topOffer = offers[0];
  const recommended = products.filter((p) => p.is_featured && p.id !== hero?.id).slice(0, 4);

  return (
    <>
      {hero && (
        <HeroExperience
          product={{
            slug: hero.slug,
            name: hero.name,
            brand: hero.brand.name,
            price: minPrice(hero),
            preset: hero.model_preset,
            modelUrl: hero.model_url,
            colors: uniqueColors(hero).map((c) => ({ ...c, image: imagesForColor(hero, c.name)[0]?.url ?? null })),
          }}
        />
      )}

      {/* Marcas destacadas */}
      <Reveal as="section" className="relative mx-auto max-w-7xl px-6 pt-24">
        <div id="marcas" className="scroll-mt-28" />
        <SectionHead eyebrow="Marcas destacadas" title="Las marcas que definen el futuro" href="/catalogo" cta="Ver catálogo" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          {brands.map((b) => {
            const count = products.filter((p) => p.brand.slug === b.slug).length;
            return (
              <Link
                data-reveal
                key={b.id}
                href={`/catalogo?brand=${b.slug}`}
                className="group card flex flex-col items-center justify-center gap-1 px-3 py-6 text-center transition hover:-translate-y-1 hover:border-cyan-400/30"
              >
                <span className="font-display text-base font-semibold tracking-wide text-zinc-200 transition group-hover:text-white">
                  {b.name}
                </span>
                <span className="text-[0.7rem] text-zinc-500">{count} {count === 1 ? "modelo" : "modelos"}</span>
              </Link>
            );
          })}
        </div>
      </Reveal>

      {/* Más vendidos */}
      <Reveal as="section" className="mx-auto max-w-7xl px-6 pt-28">
        <SectionHead eyebrow="Más vendidos" title="Los favoritos de nuestros clientes" href="/catalogo?sort=bestsellers" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {bestsellers.map((p) => (
            <div data-reveal key={p.id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </Reveal>

      {/* Nuevos lanzamientos */}
      {launches.length > 0 && (
        <Reveal as="section" className="pt-28">
          <div className="mx-auto max-w-7xl px-6">
            <SectionHead eyebrow="Nuevos lanzamientos" title={<>Recién llegados a <span className="text-gradient">NEXPHONE</span></>} href="/catalogo?sort=newest" />
          </div>
          <div className="mx-auto flex max-w-7xl snap-x snap-mandatory scroll-px-6 gap-5 overflow-x-auto px-6 pb-6 [scrollbar-width:thin]">
            {launches.map((p) => (
              <div data-reveal key={p.id} className="w-[78vw] shrink-0 snap-start sm:w-[340px]">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* Ofertas especiales */}
      {topOffer && (
        <Reveal as="section" className="mx-auto max-w-7xl px-6 pt-28">
          <SectionHead eyebrow="Ofertas especiales" title="Precios que no duran" href="/catalogo?offers=1" cta="Todas las ofertas" />
          <div className="grid gap-5 lg:grid-cols-5">
            <Link
              data-reveal
              href={`/producto/${topOffer.p.slug}`}
              className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-electric/25 via-ink-800 to-violet/25 p-8 lg:col-span-2"
            >
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
              <p className="eyebrow">Oferta destacada</p>
              <p className="mt-4 font-display text-6xl font-semibold">-{topOffer.pct}%</p>
              <h3 className="mt-3 font-display text-2xl font-semibold">{topOffer.p.name}</h3>
              <p className="mt-1 text-sm text-zinc-300">Desde {formatPEN(minPrice(topOffer.p))}</p>
              <div className="relative mx-auto mt-6 aspect-square w-3/4">
                {imagesForColor(topOffer.p, topOffer.p.variants[0]?.color_name)[0] && (
                  <Image
                    src={imagesForColor(topOffer.p, topOffer.p.variants[0]?.color_name)[0].url}
                    alt={topOffer.p.name}
                    fill
                    sizes="(max-width: 1024px) 70vw, 30vw"
                    className="object-contain transition-transform duration-700 group-hover:scale-105 group-hover:-rotate-2"
                  />
                )}
              </div>
              <span className="btn btn-primary mt-4">Aprovechar oferta</span>
            </Link>
            <div className="grid gap-5 sm:grid-cols-2 lg:col-span-3">
              {offers.slice(1, 5).map(({ p }) => (
                <div data-reveal key={p.id}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      )}

      {/* Características tecnológicas */}
      <Reveal as="section" className="mx-auto max-w-7xl px-6 pt-32">
        <SectionHead eyebrow="Tecnología" title={<>Lo que hay dentro <span className="text-gradient">importa</span></>} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Cpu, title: "Chips de 3 nm", text: "Snapdragon 8 Elite, A19 Pro y Tensor G5: potencia sostenida con eficiencia extrema." },
            { icon: MonitorSmartphone, title: "Pantallas LTPO 120 Hz", text: "OLED de hasta 6000 nits, fluidez adaptativa y protección anti-reflejos." },
            { icon: Camera, title: "Fotografía con IA", text: "Sensores de 1\", periscopios y procesamiento computacional en tiempo real." },
            { icon: BatteryCharging, title: "Carga ultrarrápida", text: "Baterías de silicio-carbono y carga de hasta 120 W: 100% en minutos." },
          ].map(({ icon: Icon, title, text }) => (
            <div data-reveal key={title} className="card group relative overflow-hidden p-7">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-electric/10 blur-2xl transition-opacity group-hover:bg-cyan-400/20" />
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-electric/30 to-violet/30 ring-1 ring-white/10">
                <Icon className="h-5 w-5 text-cyan-200" />
              </div>
              <h3 className="mt-6 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{text}</p>
            </div>
          ))}
        </div>
        <div data-reveal className="glass mt-5 grid gap-6 rounded-3xl p-6 sm:grid-cols-3 sm:p-8">
          {[
            { icon: ShieldCheck, title: "Garantía oficial", text: "Equipos 100% originales con garantía de marca." },
            { icon: Truck, title: "Envíos a todo el Perú", text: "Express en Lima en 24 h y recojo en tienda." },
            { icon: CreditCard, title: "Pago seguro", text: "Tarjetas y Yape vía Mercado Pago, o transferencia." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-4">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-zinc-400">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Recomendados */}
      {recommended.length > 0 && (
        <Reveal as="section" className="mx-auto max-w-7xl px-6 pt-32">
          <SectionHead eyebrow="Recomendados" title="Seleccionados para ti" href="/catalogo" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((p) => (
              <div data-reveal key={p.id}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </Reveal>
      )}
    </>
  );
}
