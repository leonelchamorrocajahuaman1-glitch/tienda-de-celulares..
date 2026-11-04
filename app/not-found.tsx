import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <div className="mb-10 flex justify-center"><Logo /></div>
        <p className="font-display text-8xl font-semibold text-gradient">404</p>
        <h1 className="mt-4 font-display text-2xl">Esta página no existe</h1>
        <p className="mt-2 text-zinc-400">Puede que el enlace haya cambiado o que el producto ya no esté disponible.</p>
        <Link href="/" className="btn btn-primary mt-8">Volver al inicio</Link>
      </div>
    </div>
  );
}
