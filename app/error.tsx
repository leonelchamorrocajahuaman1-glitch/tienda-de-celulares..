"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-3xl font-semibold">Algo salió mal</h1>
        <p className="mt-2 text-zinc-400">Ocurrió un error inesperado. Inténtalo nuevamente.</p>
        <button onClick={reset} className="btn btn-primary mt-8">Reintentar</button>
      </div>
    </div>
  );
}
