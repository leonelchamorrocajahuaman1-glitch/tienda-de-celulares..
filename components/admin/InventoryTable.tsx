"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState, useTransition } from "react";
import { adjustInventoryAction } from "@/app/admin/actions";
import { formatStorage } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface InvRow {
  variant_id: string;
  product: string;
  sku: string;
  color_name: string;
  color_hex: string;
  ram_gb: number;
  storage_gb: number;
  stock: number;
  threshold: number;
  active: boolean;
}

export function InventoryTable({ rows }: { rows: InvRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<"restock" | "adjustment" | "return">("restock");
  const [note, setNote] = useState("");
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const list = useMemo(
    () =>
      rows.filter(
        (r) => (!onlyLow || r.stock <= r.threshold) && (!q || `${r.product} ${r.sku} ${r.color_name}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [rows, q, onlyLow],
  );
  const low = rows.filter((r) => r.stock <= r.threshold).length;

  return (
    <>
      {low > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-300" />
          {low} variante(s) con stock bajo o agotado.
          <button className="ml-auto underline" onClick={() => setOnlyLow((v) => !v)}>{onlyLow ? "Ver todas" : "Ver solo stock bajo"}</button>
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto, SKU o color" className="input mb-4 max-w-sm" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-zinc-500">
          <thead>
            <tr>
              <th>Producto</th><th>Variante</th><th>SKU</th><th className="!text-right">Stock</th><th className="!text-right">Mínimo</th><th />
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <Fragment key={r.variant_id}>
                <tr className={cn("border-t border-white/5", !r.active && "opacity-50")}>
                  <td className="font-medium">{r.product}</td>
                  <td>
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full ring-1 ring-white/30" style={{ background: r.color_hex }} />
                      {r.color_name} · {r.ram_gb}/{formatStorage(r.storage_gb)}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-zinc-400">{r.sku}</td>
                  <td className={cn("text-right font-mono", r.stock === 0 ? "text-rose-300" : r.stock <= r.threshold ? "text-amber-300" : "")}>{r.stock}</td>
                  <td className="text-right font-mono text-zinc-500">{r.threshold}</td>
                  <td className="text-right">
                    <button
                      className="btn btn-ghost !px-3 !py-1.5 text-xs"
                      onClick={() => {
                        setEditing(editing === r.variant_id ? null : r.variant_id);
                        setDelta("");
                        setNote("");
                        setThreshold(String(r.threshold));
                        setError(null);
                      }}
                    >
                      Ajustar
                    </button>
                  </td>
                </tr>
                {editing === r.variant_id && (
                  <tr className="bg-white/[0.02]">
                    <td colSpan={6}>
                      <form
                        className="flex flex-wrap items-end gap-3 py-2"
                        onSubmit={(e) => {
                          e.preventDefault();
                          setError(null);
                          start(async () => {
                            const res = await adjustInventoryAction({
                              variant_id: r.variant_id,
                              delta: Number(delta || 0),
                              reason,
                              note,
                              threshold: threshold === "" ? undefined : Number(threshold),
                            });
                            if (res.error) setError(res.error);
                            else {
                              setEditing(null);
                              router.refresh();
                            }
                          });
                        }}
                      >
                        <label>
                          <span className="label">Cantidad (+ ingreso / − salida)</span>
                          <input type="number" className="input !w-36" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="+10" />
                        </label>
                        <label>
                          <span className="label">Motivo</span>
                          <select className="input !w-40" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
                            <option value="restock">Reposición</option>
                            <option value="adjustment">Ajuste</option>
                            <option value="return">Devolución</option>
                          </select>
                        </label>
                        <label className="min-w-48 flex-1">
                          <span className="label">Nota</span>
                          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Guía de remisión, proveedor…" />
                        </label>
                        <label>
                          <span className="label">Stock mínimo</span>
                          <input type="number" min={0} className="input !w-28" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
                        </label>
                        <button className="btn btn-primary" disabled={pending}>
                          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                        </button>
                        {error && <p className="w-full text-sm text-rose-300">{error}</p>}
                      </form>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
