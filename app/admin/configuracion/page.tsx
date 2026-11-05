import { SettingsForm, TaxonomyForm } from "@/components/admin/SettingsForms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getSystemStatus } from "@/lib/system-status";
import type { StoreSettings } from "@/lib/types";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: s }, { data: brands }, { data: categories }, status] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).single(),
    supabase.from("brands").select("id, name, slug").order("position"),
    supabase.from("categories").select("id, name, slug").order("position"),
    getSystemStatus(true),
  ]);
  return (
    <>
      <PageHeader title="Configuración" subtitle="Información comercial, contacto, envíos y catálogo" />
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel>
          <SettingsForm initial={{ ...(s as StoreSettings), shipping_standard: Number(s?.shipping_standard), shipping_express: Number(s?.shipping_express), free_shipping_from: Number(s?.free_shipping_from) }} />
        </Panel>
        <div className="space-y-6">
          <Panel title="Marcas">
            <ul className="mb-4 flex flex-wrap gap-2">{(brands ?? []).map((b) => <li key={b.id} className="rounded-full border border-white/10 px-3 py-1 text-xs">{b.name}</li>)}</ul>
            <TaxonomyForm kind="brand" />
          </Panel>
          <Panel title="Categorías">
            <ul className="mb-4 flex flex-wrap gap-2">{(categories ?? []).map((c) => <li key={c.id} className="rounded-full border border-white/10 px-3 py-1 text-xs">{c.name}</li>)}</ul>
            <TaxonomyForm kind="category" />
          </Panel>
          <Panel title="Estado del sistema (comprobado en vivo)">
            <ul className="space-y-2.5 text-sm">
              {status.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <span className={c.ok === true ? "text-emerald-300" : c.ok === false ? "text-rose-300" : "text-amber-300"}>
                    {c.ok === true ? "●" : c.ok === false ? "✕" : "○"}
                  </span>
                  <span>
                    <span className="block text-zinc-200">{c.label}</span>
                    <span className="text-xs text-zinc-500">{c.detail}</span>
                  </span>
                </li>
              ))}
              <li className="flex gap-3">
                <span className="text-amber-300">○</span>
                <span>
                  <span className="block text-zinc-200">Facturación electrónica SUNAT</span>
                  <span className="text-xs text-zinc-500">{process.env.SUNAT_EINVOICING_ENABLED === "1" ? "Habilitada" : "Pendiente de integrar un OSE/PSE"}</span>
                </span>
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
