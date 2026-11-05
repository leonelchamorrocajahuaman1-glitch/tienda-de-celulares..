import "server-only";
import { getServiceSupabase } from "@/lib/supabase/server";

/**
 * Promueve automáticamente al primer administrador: la cuenta cuyo correo coincide con
 * la variable de servidor ADMIN_EMAIL, solo si aún no hay administradores y el correo
 * está confirmado (lo verifica la función SQL bootstrap_first_admin).
 */
export async function maybeBootstrapAdmin(email: string | null | undefined) {
  const target = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!target || !email || email.trim().toLowerCase() !== target) return null;
  const admin = getServiceSupabase();
  if (!admin) return null;
  const { data, error } = await admin.rpc("bootstrap_first_admin", { p_email: target });
  if (error) {
    console.error("[bootstrap-admin]", error.message);
    return null;
  }
  return data as string;
}
