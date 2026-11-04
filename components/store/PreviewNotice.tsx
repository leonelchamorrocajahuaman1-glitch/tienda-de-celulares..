"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

export function PreviewNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(sessionStorage.getItem("nx-preview-dismissed") !== "1");
    } catch {
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-4 z-40 flex max-w-xs gap-3 rounded-2xl border border-amber-400/30 bg-ink-900/90 px-4 py-3 text-xs text-amber-200 backdrop-blur">
      <p>
        <strong className="block">Modo vista previa</strong>
        Catálogo de demostración. Configura Supabase (.env) para habilitar cuentas, pedidos y pagos.
      </p>
      <button
        aria-label="Cerrar aviso"
        className="self-start rounded-full p-1 hover:bg-white/10"
        onClick={() => {
          setShow(false);
          try {
            sessionStorage.setItem("nx-preview-dismissed", "1");
          } catch {}
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
