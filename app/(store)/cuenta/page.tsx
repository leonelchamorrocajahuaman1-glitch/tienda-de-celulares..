import Link from "next/link";
import { ProfileForm } from "@/components/account/ProfileForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireUser } from "@/lib/auth";
import { formatDate, formatPEN } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Mi cuenta" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ clave?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile, user } = await requireUser("/cuenta");
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, created_at")
    .order("created_at", { ascending: false })
    .limit(3);
  return (
    <div className="space-y-6">
      {sp.clave === "actualizada" && (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">Tu contraseña fue actualizada.</p>
      )}
      <section className="card p-6">
        <h2 className="mb-5 font-display text-xl font-semibold">Datos personales</h2>
        <ProfileForm
          initial={{
            full_name: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            document_type: profile?.document_type ?? null,
            document_number: profile?.document_number ?? null,
            email: user.email ?? "",
          }}
        />
      </section>
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Pedidos recientes</h2>
          <Link href="/cuenta/pedidos" className="text-sm text-cyan-300">Ver todos</Link>
        </div>
        {orders?.length ? (
          <ul className="divide-y divide-white/5">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/cuenta/pedidos/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:text-cyan-200">
                  <span className="font-mono text-sm">{o.order_number}</span>
                  <span className="text-sm text-zinc-400">{formatDate(o.created_at)}</span>
                  <StatusBadge status={o.status as OrderStatus} />
                  <span className="font-mono text-sm">{formatPEN(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">Aún no tienes pedidos. <Link href="/catalogo" className="text-cyan-300">Explora el catálogo</Link>.</p>
        )}
      </section>
      <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Seguridad</h2>
          <p className="text-sm text-zinc-400">Cambia tu contraseña mediante un enlace seguro.</p>
        </div>
        <Link href="/actualizar-clave" className="btn btn-ghost">Cambiar contraseña</Link>
      </section>
    </div>
  );
}
