"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { maybeBootstrapAdmin } from "@/lib/bootstrap-admin";
import { siteUrl } from "@/lib/env";
import { safeNext } from "@/lib/safe-redirect";
import { getServerSupabase } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  success?: string;
  fields?: Record<string, string>;
}

const NOT_CONFIGURED: FormState = { error: "La autenticación no está configurada (faltan variables de Supabase)." };

const email = z.string().trim().toLowerCase().email("Correo electrónico inválido").max(160);
const password = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72)
  .regex(/[A-Za-z]/, "Incluye al menos una letra")
  .regex(/[0-9]/, "Incluye al menos un número");

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  const sb = await getServerSupabase();
  if (!sb) return NOT_CONFIGURED;
  const parsed = z.object({ email, password: z.string().min(1, "Ingresa tu contraseña").max(72) }).safeParse({
    email: fd.get("email"),
    password: fd.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: { email: String(fd.get("email") ?? "") } };
  const { data: signed, error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) {
    const msg = /confirm/i.test(error.message)
      ? "Confirma tu correo antes de ingresar."
      : "Correo o contraseña incorrectos.";
    return { error: msg, fields: { email: parsed.data.email } };
  }
  const promoted = (await maybeBootstrapAdmin(signed.user?.email)) === "promovido";
  redirect(promoted ? "/admin" : safeNext(fd.get("next")));
}

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const sb = await getServerSupabase();
  if (!sb) return NOT_CONFIGURED;
  const schema = z
    .object({
      full_name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120),
      phone: z.string().trim().regex(/^[+0-9 ]{6,20}$/, "Teléfono inválido").or(z.literal("")),
      email,
      password,
      confirm: z.string(),
      terms: z.literal("on", { errorMap: () => ({ message: "Debes aceptar los términos y la política de privacidad" }) }),
    })
    .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });
  const raw = Object.fromEntries(["full_name", "phone", "email", "password", "confirm", "terms"].map((k) => [k, fd.get(k) ?? ""]));
  const parsed = schema.safeParse(raw);
  const fields = { full_name: String(raw.full_name), phone: String(raw.phone), email: String(raw.email) };
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Solo datos de perfil: el rol lo asigna la base de datos (siempre 'customer').
      data: { full_name: parsed.data.full_name, phone: parsed.data.phone },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/cuenta`,
    },
  });
  if (error) {
    return { error: /registered|exists/i.test(error.message) ? "Ya existe una cuenta con ese correo." : "No se pudo crear la cuenta. Inténtalo nuevamente.", fields };
  }
  if (data.session) {
    // Confirmación de correo desactivada en Supabase: la sesión es inmediata
    const promoted = (await maybeBootstrapAdmin(data.user?.email)) === "promovido";
    redirect(promoted ? "/admin" : safeNext(fd.get("next")));
  }
  return { success: "¡Cuenta creada! Te enviamos un correo para confirmar tu dirección." };
}

export async function resetRequestAction(_: FormState, fd: FormData): Promise<FormState> {
  const sb = await getServerSupabase();
  if (!sb) return NOT_CONFIGURED;
  const parsed = email.safeParse(fd.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await sb.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/actualizar-clave`,
  });
  // Mensaje genérico: no revela si el correo existe.
  return { success: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña." };
}

export async function updatePasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const sb = await getServerSupabase();
  if (!sb) return NOT_CONFIGURED;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { error: "El enlace expiró. Solicita uno nuevo." };
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden" })
    .safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await sb.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: "No se pudo actualizar la contraseña." };
  redirect("/cuenta?clave=actualizada");
}

export async function signOutAction() {
  const sb = await getServerSupabase();
  if (sb) await sb.auth.signOut();
  redirect("/");
}
