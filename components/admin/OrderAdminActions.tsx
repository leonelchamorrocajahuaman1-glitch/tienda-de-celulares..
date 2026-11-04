"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { confirmManualPaymentAction, saveAdminNotesAction, updateOrderStatusAction } from "@/app/admin/actions";
import { ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export function OrderAdminActions({
  orderId,
  status,
  paymentMethod,
  paid,
  tracking,
  adminNotes,
}: {
  orderId: string;
  status: OrderStatus;
  paymentMethod: string;
  paid: boolean;
  tracking: string | null;
  adminNotes: string | null;
}) {
  const router = useRouter();
  const [next, setNext] = useState<OrderStatus>(status);
  const [note, setNote] = useState("");
  const [track, setTrack] = useState(tracking ?? "");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState(adminNotes ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: ok });
      if (!r.error) router.refresh();
    });

  return (
    <div className="space-y-6">
      {!paid && paymentMethod !== "mercadopago" && status !== "cancelled" && (
        <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.04] p-4">
          <p className="text-sm font-medium">Confirmar pago manual</p>
          <p className="mb-3 text-xs text-zinc-400">Solo después de verificar la operación en tu banco o caja. Esto descuenta stock y genera el comprobante.</p>
          <div className="flex flex-wrap gap-2">
            <input className="input max-w-xs" placeholder="N.° de operación / referencia" value={ref} onChange={(e) => setRef(e.target.value)} maxLength={80} />
            <button
              className="btn btn-primary"
              disabled={pending}
              onClick={() => confirm("¿Confirmas que el pago fue verificado?") && run(() => confirmManualPaymentAction(orderId, ref), "Pago confirmado")}
            >
              Confirmar pago
            </button>
          </div>
        </div>
      )}
      {!paid && paymentMethod === "mercadopago" && (
        <p className="rounded-2xl border border-white/10 p-4 text-xs text-zinc-400">
          Los pagos con Mercado Pago se confirman automáticamente cuando la pasarela notifica la aprobación (webhook verificado).
        </p>
      )}

      <div>
        <p className="label">Actualizar estado</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="input" value={next} onChange={(e) => setNext(e.target.value as OrderStatus)}>
            {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}
          </select>
          <input className="input" placeholder="Código de seguimiento (courier)" value={track} onChange={(e) => setTrack(e.target.value)} maxLength={80} />
          <input className="input sm:col-span-2" placeholder="Nota para el historial (visible para el cliente)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
        <button
          className="btn btn-primary mt-3"
          disabled={pending}
          onClick={() => {
            if ((next === "cancelled" || next === "refunded") && !confirm("Se repondrá el stock si ya fue descontado. ¿Continuar?")) return;
            run(() => updateOrderStatusAction({ order_id: orderId, status: next, note, tracking: track }), "Estado actualizado");
          }}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar estado
        </button>
      </div>

      <div>
        <p className="label">Notas internas (no visibles para el cliente)</p>
        <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
        <button className="btn btn-ghost mt-2" disabled={pending} onClick={() => run(() => saveAdminNotesAction(orderId, notes), "Notas guardadas")}>
          Guardar notas
        </button>
      </div>
      {msg && <p role="status" className={msg.ok ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{msg.text}</p>}
    </div>
  );
}
