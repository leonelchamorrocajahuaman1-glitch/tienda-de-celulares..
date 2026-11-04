"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  type FormState,
  resetRequestAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
} from "@/app/(auth)/actions";

function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary w-full !py-3.5" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

function Alert({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
        {state.error}
      </p>
    );
  if (state.success)
    return (
      <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
        {state.success}
      </p>
    );
  return null;
}

function PasswordInput({ name, label, autoComplete }: { name: string; label: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <div className="relative">
        <input id={name} name={name} type={show ? "text" : "password"} required autoComplete={autoComplete} className="input pr-11" maxLength={72} />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-400 hover:text-white" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState(signInAction, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Bienvenido de vuelta</h1>
        <p className="mt-1 text-sm text-zinc-400">Ingresa para continuar con tu compra.</p>
      </div>
      {notice && !state.error && <p className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">{notice}</p>}
      <Alert state={state} />
      <input type="hidden" name="next" value={next} />
      <div>
        <label className="label" htmlFor="email">Correo electrónico</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.fields?.email} className="input" />
      </div>
      <PasswordInput name="password" label="Contraseña" autoComplete="current-password" />
      <div className="flex justify-end">
        <Link href="/recuperar" className="text-xs text-cyan-300 hover:text-cyan-200">¿Olvidaste tu contraseña?</Link>
      </div>
      <Submit>Ingresar</Submit>
      <p className="text-center text-sm text-zinc-400">
        ¿No tienes cuenta?{" "}
        <Link href={`/registro?next=${encodeURIComponent(next)}`} className="text-cyan-300 hover:text-cyan-200">Crear cuenta</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUpAction, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Crea tu cuenta</h1>
        <p className="mt-1 text-sm text-zinc-400">Compra más rápido y sigue tus pedidos.</p>
      </div>
      <Alert state={state} />
      {!state.success && (
        <>
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="full_name">Nombre completo</label>
            <input id="full_name" name="full_name" required autoComplete="name" maxLength={120} defaultValue={state.fields?.full_name} className="input" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="email">Correo</label>
              <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state.fields?.email} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Celular (opcional)</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="999 999 999" defaultValue={state.fields?.phone} className="input" />
            </div>
          </div>
          <PasswordInput name="password" label="Contraseña (mín. 8, letras y números)" autoComplete="new-password" />
          <PasswordInput name="confirm" label="Confirmar contraseña" autoComplete="new-password" />
          <label className="flex items-start gap-2.5 text-xs text-zinc-400">
            <input type="checkbox" name="terms" required className="mt-0.5 h-4 w-4 accent-cyan-400" />
            <span>
              Acepto los <Link href="/legal/terminos" className="text-cyan-300">términos y condiciones</Link> y la{" "}
              <Link href="/legal/privacidad" className="text-cyan-300">política de privacidad</Link> (Ley N.° 29733).
            </span>
          </label>
          <Submit>Crear cuenta</Submit>
        </>
      )}
      <p className="text-center text-sm text-zinc-400">
        ¿Ya tienes cuenta? <Link href={`/ingresar?next=${encodeURIComponent(next)}`} className="text-cyan-300 hover:text-cyan-200">Ingresar</Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(resetRequestAction, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Recuperar contraseña</h1>
        <p className="mt-1 text-sm text-zinc-400">Te enviaremos un enlace seguro a tu correo.</p>
      </div>
      <Alert state={state} />
      <div>
        <label className="label" htmlFor="email">Correo electrónico</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <Submit>Enviar enlace</Submit>
      <p className="text-center text-sm text-zinc-400">
        <Link href="/ingresar" className="text-cyan-300 hover:text-cyan-200">Volver a ingresar</Link>
      </p>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, {});
  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Nueva contraseña</h1>
        <p className="mt-1 text-sm text-zinc-400">Elige una contraseña segura que no uses en otros sitios.</p>
      </div>
      <Alert state={state} />
      <PasswordInput name="password" label="Nueva contraseña" autoComplete="new-password" />
      <PasswordInput name="confirm" label="Confirmar contraseña" autoComplete="new-password" />
      <Submit>Actualizar contraseña</Submit>
    </form>
  );
}
