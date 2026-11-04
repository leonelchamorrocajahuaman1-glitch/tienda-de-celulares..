import { SettingsForm, TaxonomyForm } from "@/components/admin/SettingsForms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import type { StoreSettings } from "@/lib/types";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: s }, { data: brands }, { data: categories }] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).single(),
    supabase.from("brands").select("id, name, slug").order("position"),
    supabase.from("categories").select("id, name, slug").order("position"),
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
          <Panel title="Integraciones">
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>Mercado Pago: {process.env.MP_ACCESS_TOKEN ? (process.env.MP_ACCESS_TOKEN.startsWith("TEST-") ? "modo pruebas" : "producción") : "no configurado"}</li>
              <li>Webhook firmado: {process.env.MP_WEBHOOK_SECRET ? "sí" : "no (requerido en producción)"}</li>
              <li>Facturación electrónica SUNAT: {process.env.SUNAT_EINVOICING_ENABLED === "1" ? "habilitada" : "pendiente de integrar OSE/PSE"}</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
