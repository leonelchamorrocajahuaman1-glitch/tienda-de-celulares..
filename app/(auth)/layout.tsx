import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { isSupabaseConfigured } from "@/lib/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute left-1/2 top-[-10%] h-[60vh] w-[70vw] -translate-x-1/2 rounded-full bg-electric/20 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[50vh] w-[40vw] rounded-full bg-violet/20 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="glass-strong rounded-[2rem] p-7 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:p-9">
          {!isSupabaseConfigured && (
            <p className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              Supabase no está configurado: los formularios no podrán autenticar hasta definir las variables de entorno.
            </p>
          )}
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-white">← Volver a la tienda</Link>
        </p>
      </div>
    </div>
  );
}
