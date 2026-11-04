import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-redirect";
import { getServerSupabase } from "@/lib/supabase/server";

/** Verificación por token_hash (plantillas de correo de Supabase con {{ .TokenHash }}). */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(url.searchParams.get("next"));
  const sb = await getServerSupabase();
  if (token_hash && type && sb) {
    const { error } = await sb.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/actualizar-clave" : next, url.origin));
  }
  return NextResponse.redirect(new URL("/ingresar?error=enlace-invalido", url.origin));
}
