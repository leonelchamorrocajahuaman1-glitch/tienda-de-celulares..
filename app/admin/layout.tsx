import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Admin NEXPHONE" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Autorización en servidor basada en profiles.role (además, RLS protege cada consulta)
  const { supabase, profile, user } = await requireAdmin();
  const [{ count: pendingOrders }, { data: inv }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["paid", "requires_attention"]),
    supabase.from("inventory").select("stock, low_stock_threshold"),
  ]);
  const lowStock = (inv ?? []).filter((i) => i.stock <= i.low_stock_threshold).length;
  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top_right,rgba(47,107,255,0.08),transparent_50%)]">
      <AdminNav name={profile?.full_name || user.email || "Admin"} alerts={{ pendingOrders: pendingOrders ?? 0, lowStock }} />
      <main className="px-4 py-8 sm:px-8 lg:ml-64 lg:px-10">{children}</main>
    </div>
  );
}
