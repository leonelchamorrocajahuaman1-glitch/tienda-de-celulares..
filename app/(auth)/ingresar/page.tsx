import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForms";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/safe-redirect";

export const metadata = { title: "Ingresar" };

const NOTICES: Record<string, string> = {
  "enlace-invalido": "El enlace no es válido o expiró. Solicita uno nuevo.",
  "cuenta-desactivada": "Tu cuenta está desactivada. Contáctanos para más información.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const session = await getSession();
  if (session && session.profile?.is_active !== false) redirect(next);
  return <LoginForm next={next} notice={sp.error ? NOTICES[sp.error] : undefined} />;
}
