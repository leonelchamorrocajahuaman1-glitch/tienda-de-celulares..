import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import type { Brand, StoreSettings } from "@/lib/types";

export function Footer({ settings, brands }: { settings: StoreSettings; brands: Brand[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-32 border-t border-white/[0.06] bg-ink-900/60">
      <div className="pointer-events-none absolute inset-x-0 -top-px mx-auto h-px max-w-3xl bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-zinc-400">
            Tienda premium de smartphones en Perú. Equipos originales, garantía oficial y envíos a todo el país.
          </p>
          <dl className="mt-6 space-y-1.5 text-sm text-zinc-400">
            {settings.address && <div>{settings.address}</div>}
            {settings.business_hours && <div>{settings.business_hours}</div>}
            {settings.email && (
              <div>
                <a className="hover:text-white" href={`mailto:${settings.email}`}>
                  {settings.email}
                </a>
              </div>
            )}
            {settings.phone && <div>{settings.phone}</div>}
          </dl>
        </div>
        <div>
          <h3 className="eyebrow mb-4">Marcas</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-zinc-400 lg:grid-cols-1">
            {brands.map((b) => (
              <li key={b.id}>
                <Link className="hover:text-white" href={`/catalogo?brand=${b.slug}`}>
                  {b.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-4">Tienda</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li><Link className="hover:text-white" href="/catalogo">Catálogo completo</Link></li>
            <li><Link className="hover:text-white" href="/catalogo?offers=1">Ofertas</Link></li>
            <li><Link className="hover:text-white" href="/catalogo?sort=newest">Nuevos lanzamientos</Link></li>
            <li><Link className="hover:text-white" href="/catalogo?category=plegables">Plegables</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-4">Ayuda</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li><Link className="hover:text-white" href="/cuenta">Mi cuenta</Link></li>
            <li><Link className="hover:text-white" href="/cuenta/pedidos">Seguimiento de pedidos</Link></li>
            <li><Link className="hover:text-white" href="/legal/envios">Envíos y entregas</Link></li>
            <li><Link className="hover:text-white" href="/legal/terminos">Términos y condiciones</Link></li>
            <li><Link className="hover:text-white" href="/legal/privacidad">Política de privacidad</Link></li>
            <li><Link className="hover:text-white" href="/legal/reclamaciones">Libro de reclamaciones</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-zinc-500 sm:flex-row">
          <p>
            © {year} {settings.legal_name}
            {settings.ruc && ` · RUC ${settings.ruc}`}. Todos los precios en soles (S/) incluyen IGV.
          </p>
          <p>Las marcas mencionadas pertenecen a sus respectivos titulares.</p>
        </div>
      </div>
    </footer>
  );
}
