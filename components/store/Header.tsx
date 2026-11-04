"use client";

import { AnimatePresence, motion } from "framer-motion";
import { LayoutDashboard, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { cartCount, useCart, useCartHydrated } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/catalogo?sort=newest", label: "Lanzamientos" },
  { href: "/catalogo?offers=1", label: "Ofertas" },
  { href: "/catalogo?category=plegables", label: "Plegables" },
  { href: "/#marcas", label: "Marcas" },
];

export interface HeaderUser {
  name: string;
  isAdmin: boolean;
}

export function Header({ user, announcement }: { user: HeaderUser | null; announcement?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const hydrated = useCartHydrated();
  const setOpen = useCart((s) => s.setOpen);
  const count = hydrated ? cartCount(items) : 0;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setMenu(false);
    setSearch(false);
  }, [pathname]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {announcement && (
        <div className="bg-gradient-to-r from-electric/80 via-cyan-500/70 to-violet/80 px-4 py-1.5 text-center text-[0.72rem] font-medium tracking-wide text-white">
          {announcement}
        </div>
      )}
      <div
        className={cn(
          "mx-auto mt-3 flex max-w-7xl items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-all duration-500 sm:px-5",
          scrolled ? "glass-strong mx-3 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)] xl:mx-auto" : "border border-transparent",
        )}
      >
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3.5 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearch((s) => !s)}
            className="rounded-full p-2.5 text-zinc-300 transition hover:bg-white/5 hover:text-white"
            aria-label="Buscar"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          {user?.isAdmin && (
            <Link
              href="/admin"
              className="hidden rounded-full p-2.5 text-violet-300 transition hover:bg-white/5 sm:inline-flex"
              aria-label="Panel administrativo"
              title="Panel administrativo"
            >
              <LayoutDashboard className="h-[18px] w-[18px]" />
            </Link>
          )}
          <Link
            href={user ? "/cuenta" : "/ingresar"}
            className="hidden items-center gap-2 rounded-full p-2.5 text-zinc-300 transition hover:bg-white/5 hover:text-white sm:inline-flex"
            aria-label={user ? "Mi cuenta" : "Ingresar"}
          >
            <User className="h-[18px] w-[18px]" />
            <span className="hidden max-w-28 truncate text-sm xl:inline">{user ? user.name : "Ingresar"}</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative rounded-full p-2.5 text-zinc-200 transition hover:bg-white/5 hover:text-white"
            aria-label={`Carrito (${count} productos)`}
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-cyan-400 px-1 text-[0.65rem] font-bold text-ink-950"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => setMenu((m) => !m)}
            className="rounded-full p-2.5 text-zinc-200 lg:hidden"
            aria-label="Menú"
            aria-expanded={menu}
          >
            {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {search && (
          <motion.form
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/catalogo?q=${encodeURIComponent(q.trim())}`);
            }}
            className="glass-strong mx-3 mt-2 flex max-w-2xl items-center gap-2 rounded-2xl p-2 sm:mx-auto"
            role="search"
          >
            <Search className="ml-2 h-4 w-4 text-zinc-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar iPhone, Galaxy, Pixel…"
              className="flex-1 bg-transparent py-2 text-sm text-white outline-none placeholder:text-zinc-500"
              aria-label="Buscar productos"
            />
            <button className="btn btn-primary !py-2">Buscar</button>
          </motion.form>
        )}
        {menu && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-strong mx-3 mt-2 grid gap-1 rounded-2xl p-3 lg:hidden"
            aria-label="Móvil"
          >
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-xl px-4 py-3 text-zinc-200 hover:bg-white/5">
                {n.label}
              </Link>
            ))}
            <Link href={user ? "/cuenta" : "/ingresar"} className="rounded-xl px-4 py-3 text-zinc-200 hover:bg-white/5">
              {user ? "Mi cuenta" : "Ingresar / Registrarse"}
            </Link>
            {user?.isAdmin && (
              <Link href="/admin" className="rounded-xl px-4 py-3 text-violet-300 hover:bg-white/5">
                Panel administrativo
              </Link>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
