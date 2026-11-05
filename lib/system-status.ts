import "server-only";
import { SUPABASE_URL, isSupabaseConfigured, siteUrl } from "@/lib/env";
import { mpConfigured, mpIsTestMode } from "@/lib/payments/mercadopago";
import { getPublicSupabase, getServiceSupabase } from "@/lib/supabase/server";

export type Check = { id: string; label: string; ok: boolean | null; detail: string };

/**
 * Comprobaciones REALES de las integraciones (consultas en vivo, no suposiciones).
 * ok=null significa "no configurado todavía".
 */
export async function getSystemStatus(detailed: boolean): Promise<Check[]> {
  const checks: Check[] = [];

  checks.push({
    id: "site",
    label: "URL pública",
    ok: !siteUrl().includes("localhost") || process.env.NODE_ENV !== "production",
    detail: siteUrl(),
  });

  if (!isSupabaseConfigured) {
    checks.push({ id: "supabase", label: "Supabase", ok: null, detail: "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY" });
  } else {
    const pub = getPublicSupabase()!;
    const { error } = await pub.from("store_settings").select("id").eq("id", 1).maybeSingle();
    checks.push({
      id: "supabase",
      label: "Supabase (API pública)",
      ok: !error,
      detail: error ? `Error: ${error.message}` : `Conectado a ${new URL(SUPABASE_URL).hostname}`,
    });
    const svc = getServiceSupabase();
    if (!svc) {
      checks.push({ id: "service", label: "Clave de servicio", ok: null, detail: "Falta SUPABASE_SERVICE_ROLE_KEY (necesaria para webhooks)" });
    } else {
      const { data, error: e2 } = await svc.rpc("nexphone_schema_status");
      if (e2) {
        checks.push({ id: "schema", label: "Esquema de base de datos", ok: false, detail: `No inicializado: ${e2.message}` });
      } else {
        const s = data as { tables: number; tables_expected: number; functions: number; functions_expected: number; rls_disabled: string[]; buckets: string[]; products: number; admins: number };
        const okSchema = s.tables === s.tables_expected && s.functions === s.functions_expected && s.rls_disabled.length === 0;
        checks.push({
          id: "schema",
          label: "Esquema y RLS",
          ok: okSchema,
          detail: detailed ? `${s.tables}/${s.tables_expected} tablas · ${s.functions}/${s.functions_expected} funciones · RLS ${s.rls_disabled.length ? `desactivado en ${s.rls_disabled.join(", ")}` : "activo en todas"}` : okSchema ? "Completo" : "Incompleto",
        });
        checks.push({ id: "storage", label: "Storage (imágenes y modelos 3D)", ok: s.buckets.length === 2, detail: s.buckets.length === 2 ? "Buckets creados" : "Faltan buckets" });
        checks.push({ id: "catalog", label: "Catálogo", ok: s.products > 0, detail: `${s.products} productos` });
        checks.push({ id: "admin", label: "Administrador", ok: s.admins > 0, detail: s.admins > 0 ? `${s.admins} administrador(es)` : process.env.ADMIN_EMAIL ? "Regístrate y confirma el correo de ADMIN_EMAIL" : "Define ADMIN_EMAIL" });
      }
    }
  }

  if (!mpConfigured()) {
    checks.push({ id: "mp", label: "Mercado Pago", ok: null, detail: "Falta MP_ACCESS_TOKEN" });
  } else {
    try {
      const res = await fetch("https://api.mercadopago.com/users/me", {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
        cache: "no-store",
      });
      const me = (await res.json().catch(() => ({}))) as { site_id?: string; id?: number };
      const ok = res.ok && me.site_id === "MPE";
      checks.push({
        id: "mp",
        label: `Mercado Pago (${mpIsTestMode() ? "pruebas" : "producción"})`,
        ok,
        detail: !res.ok ? `Credencial rechazada (HTTP ${res.status})` : me.site_id !== "MPE" ? `La cuenta no es de Perú (site ${me.site_id})` : detailed ? `Cuenta ${me.id} · Perú` : "Credencial válida",
      });
    } catch {
      checks.push({ id: "mp", label: "Mercado Pago", ok: false, detail: "No se pudo contactar la API" });
    }
    checks.push({
      id: "mp_webhook",
      label: "Webhook firmado",
      ok: Boolean(process.env.MP_WEBHOOK_SECRET),
      detail: process.env.MP_WEBHOOK_SECRET ? `${siteUrl()}/api/webhooks/mercadopago` : "Falta MP_WEBHOOK_SECRET",
    });
  }
  return checks;
}
