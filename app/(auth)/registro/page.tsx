import { RegisterForm } from "@/components/auth/AuthForms";
import { safeNext } from "@/lib/safe-redirect";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  return <RegisterForm next={safeNext(sp.next)} />;
}
