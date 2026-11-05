import { NextResponse, type NextRequest } from "next/server";
import { maybeBootstrapAdmin } from "@/lib/bootstrap-admin";
import { safeNext } from "@/lib/safe-redirect";
import { getServerSupabase } from "@/lib/supabase/server";

/** Intercambia el código de Supabase (confirmación de correo / recuperación) por una sesión. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const sb = await getServerSupabase();
  if (code && sb) {
    const { data, error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) {
      const promoted = (await maybeBootstrapAdmin(data.user?.email)) === "promovido";
      return NextResponse.redirect(new URL(promoted ? "/admin" : next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/ingresar?error=enlace-invalido", url.origin));
}
