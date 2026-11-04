"use client";

import { CreditCard, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrderAction } from "@/app/(store)/cuenta/actions";

export function OrderActions({ orderId, canPay, canCancel }: { orderId: string; canPay: boolean; canCancel: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {canPay && (
        <button
          className="btn btn-primary"
          disabled={paying}
          onClick={async () => {
            setPaying(true);
            setError(null);
            const res = await fetch("/api/orders/pay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && typeof data.redirect === "string" && data.redirect.startsWith("https://")) window.location.href = data.redirect;
            else {
              setError(data.error ?? "No se pudo iniciar el pago");
              setPaying(false);
            }
          }}
        >
          {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pagar ahora
        </button>
      )}
      {canCancel && (
        <button
          className="btn btn-danger"
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Cancelar este pedido?")) return;
            start(async () => {
              const r = await cancelOrderAction(orderId);
              if (r.error) setError(r.error);
              router.refresh();
            });
          }}
        >
          <XCircle className="h-4 w-4" /> Cancelar pedido
        </button>
      )}
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}
