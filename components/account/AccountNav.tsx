"use client";

import { LogOut, MapPin, Package, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/cuenta", label: "Perfil", icon: User },
  { href: "/cuenta/pedidos", label: "Mis pedidos", icon: Package },
  { href: "/cuenta/direcciones", label: "Direcciones", icon: MapPin },
];

export function AccountNav() {
  const path = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Mi cuenta">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/cuenta" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition",
              active ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        );
      })}
      <form action={signOutAction}>
        <button className="flex w-full shrink-0 items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:bg-rose-500/10 hover:text-rose-300">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </form>
    </nav>
  );
}
