import { UpdatePasswordForm } from "@/components/auth/AuthForms";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Nueva contraseña" };

export default async function UpdatePasswordPage() {
  await requireUser("/actualizar-clave");
  return <UpdatePasswordForm />;
}
