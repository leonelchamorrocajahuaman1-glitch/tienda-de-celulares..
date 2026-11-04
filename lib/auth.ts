import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getServerSupabase } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  document_type: string | null;
  document_number: string | null;
  role: "customer" | "admin";
  is_active: boolean;
  created_at: string;
}

/** Usuario verificado contra Supabase Auth (getUser valida el JWT en el servidor). */
export const getSession = cache(async () => {
  const sb = await getServerSupabase();
  if (!sb) return null;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;
  const { data: profile } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { user, profile: (profile as Profile | null) ?? null, supabase: sb };
});

export async function requireUser(next = "/cuenta") {
  const s = await getSession();
  if (!s) redirect(`/ingresar?next=${encodeURIComponent(next)}`);
  if (s.profile && !s.profile.is_active) redirect("/ingresar?error=cuenta-desactivada");
  return s;
}

/**
 * Autorización de administrador basada en la BD (profiles.role), nunca en datos del navegador.
 * Además, todas las tablas/funciones verifican is_admin() mediante RLS.
 */
export async function requireAdmin() {
  const s = await getSession();
  if (!s) redirect("/ingresar?next=/admin");
  if (s.profile?.role !== "admin" || !s.profile.is_active) notFound();
  return s;
}
