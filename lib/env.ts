export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true cuando las credenciales públicas de Supabase están configuradas. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * URL pública del sitio. Prioridad: NEXT_PUBLIC_SITE_URL → dominio de producción de Vercel
 * (VERCEL_PROJECT_PRODUCTION_URL, automático) → URL del despliegue → localhost.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const prod =
    process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined;
  const deployment = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  return (explicit || prod || deployment || "http://localhost:3000").replace(/\/$/, "");
}
