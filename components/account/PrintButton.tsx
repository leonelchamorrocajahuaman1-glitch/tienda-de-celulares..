"use client";

import { Download, Printer } from "lucide-react";

export function PrintButtons() {
  return (
    <div className="no-print flex gap-2">
      <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white">
        <Printer className="h-4 w-4" /> Imprimir
      </button>
      <button
        onClick={() => window.print()}
        title="En el diálogo de impresión elige “Guardar como PDF”"
        className="inline-flex items-center gap-2 rounded-full border border-black/20 px-4 py-2 text-sm font-medium text-black"
      >
        <Download className="h-4 w-4" /> Descargar PDF
      </button>
    </div>
  );
}
