"use client";

import {
  BarChart3,
  Boxes,
  CreditCard,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Smartphone,
  TicketPercent,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Smartphone },
  { href: "/admin/inventario", label: "Inventario", icon: Boxes },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingCart },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/pagos", label: "Pagos", icon: CreditCard },
  { href: "/admin/promociones", label: "Promociones", icon: TicketPercent },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export function AdminNav({ name, alerts }: { name: string; alerts: { pendingOrders: number; lowStock: number } }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const nav = (
    <nav className="flex flex-col gap-1" aria-label="Administración">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        const badge = href === "/admin/pedidos" ? alerts.pendingOrders : href === "/admin/inventario" ? alerts.lowStock : 0;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition",
              active ? "bg-gradient-to-r from-electric/25 to-violet/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cyan-400" />}
            <Icon className={cn("h-4 w-4", active && "text-cyan-300")} />
            {label}
            {badge > 0 && (
              <span className="ml-auto rounded-full bg-amber-400/15 px-2 py-0.5 font-mono text-[0.65rem] text-amber-300">{badge}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-ink-900/80 p-5 backdrop-blur-xl lg:flex">
        <Logo href="/admin" suffix="ADMIN" />
        <div className="mt-8 flex-1 overflow-y-auto">{nav}</div>
        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs">
          <p className="text-zinc-500">Sesión de administrador</p>
          <p className="truncate font-medium text-zinc-200">{name}</p>
          <Link href="/" className="mt-2 inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200">
            <Package className="h-3 w-3" /> Ver tienda
          </Link>
        </div>
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-ink-900/90 px-4 py-3 backdrop-blur lg:hidden">
        <Logo href="/admin" suffix="ADMIN" />
        <button onClick={() => setOpen((o) => !o)} className="rounded-full p-2" aria-label="Menú" aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && <div className="glass-strong fixed inset-x-3 top-16 z-50 rounded-2xl p-3 lg:hidden">{nav}</div>}
    </>
  );
}
