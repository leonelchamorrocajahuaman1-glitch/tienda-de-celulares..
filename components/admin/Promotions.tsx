"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createCouponAction, deleteCouponAction, setOfferAction, toggleCouponAction } from "@/app/admin/actions";
import { formatDate, formatPEN } from "@/lib/format";

export interface CouponRow {
  id: string;
  code: string;
  description: string | null;
  type: "percent" | "fixed";
  value: number;
  min_subtotal: number;
  max_discount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}

export function CouponForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [type, setType] = useState<"percent" | "fixed">("percent");
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = Object.fromEntries(new FormData(form));
        start(async () => {
          const r = await createCouponAction(fd);
          setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Cupón creado" });
          if (!r.error) {
            form.reset();
            router.refresh();
          }
        });
      }}
    >
      <label><span className="label">Código</span><input name="code" required className="input uppercase" maxLength={30} placeholder="VERANO10" /></label>
      <label>
        <span className="label">Tipo</span>
        <select name="type" className="input" value={type} onChange={(e) => setType(e.target.value as "percent" | "fixed")}>
          <option value="percent">Porcentaje (%)</option>
          <option value="fixed">Monto fijo (S/)</option>
        </select>
      </label>
      <label><span className="label">Valor {type === "percent" ? "(%)" : "(S/)"}</span><input name="value" type="number" step="0.01" min="0.01" max={type === "percent" ? 90 : undefined} required className="input" /></label>
      <label><span className="label">Compra mínima (S/)</span><input name="min_subtotal" type="number" step="0.01" min="0" defaultValue={0} className="input" /></label>
      <label><span className="label">Tope de descuento (S/)</span><input name="max_discount" type="number" step="0.01" min="0" className="input" placeholder="Sin tope" /></label>
      <label><span className="label">Usos máximos</span><input name="max_uses" type="number" min="1" className="input" placeholder="Ilimitado" /></label>
      <label><span className="label">Inicio</span><input name="starts_at" type="datetime-local" className="input" /></label>
      <label><span className="label">Fin</span><input name="ends_at" type="datetime-local" className="input" /></label>
      <label className="sm:col-span-2 lg:col-span-3"><span className="label">Descripción</span><input name="description" className="input" maxLength={200} /></label>
      <div className="flex items-end gap-3">
        <button className="btn btn-primary w-full" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Crear cupón</button>
      </div>
      {msg && <p className={`text-sm sm:col-span-2 lg:col-span-4 ${msg.ok ? "text-emerald-300" : "text-rose-300"}`}>{msg.text}</p>}
    </form>
  );
}

export function CouponList({ coupons }: { coupons: CouponRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!coupons.length) return <p className="py-6 text-center text-sm text-zinc-500">Aún no hay cupones.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:text-zinc-500">
        <thead><tr><th>Código</th><th>Descuento</th><th>Condiciones</th><th>Vigencia</th><th>Usos</th><th>Estado</th><th /></tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id} className="border-t border-white/5">
              <td className="font-mono font-medium">{c.code}<span className="block font-sans text-xs text-zinc-500">{c.description}</span></td>
              <td>{c.type === "percent" ? `${c.value}%` : formatPEN(c.value)}</td>
              <td className="text-xs text-zinc-400">Mín. {formatPEN(c.min_subtotal)}{c.max_discount && ` · Tope ${formatPEN(c.max_discount)}`}</td>
              <td className="text-xs text-zinc-400">{c.starts_at ? formatDate(c.starts_at) : "—"} → {c.ends_at ? formatDate(c.ends_at) : "sin fin"}</td>
              <td>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
              <td>
                <button disabled={pending} onClick={() => start(async () => { await toggleCouponAction(c.id, !c.is_active); router.refresh(); })} className={c.is_active ? "text-emerald-300" : "text-zinc-500"}>
                  {c.is_active ? "Activo" : "Inactivo"}
                </button>
              </td>
              <td>
                <button
                  disabled={pending}
                  onClick={() => confirm(`¿Eliminar el cupón ${c.code}?`) && start(async () => { const r = await deleteCouponAction(c.id); if (r.error) alert(r.error); router.refresh(); })}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-300"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OfferManager({ products }: { products: { id: string; name: string; price: number; compare: number | null }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pct, setPct] = useState<Record<string, string>>({});
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:uppercase [&_th]:text-zinc-500">
        <thead><tr><th>Producto</th><th>Precio desde</th><th>Oferta actual</th><th>Aplicar descuento</th></tr></thead>
        <tbody>
          {products.map((p) => {
            const current = p.compare && p.compare > p.price ? Math.round((1 - p.price / p.compare) * 100) : 0;
            return (
              <tr key={p.id} className="border-t border-white/5">
                <td className="font-medium">{p.name}</td>
                <td className="font-mono">{formatPEN(p.price)}{p.compare && <span className="ml-2 text-xs text-zinc-500 line-through">{formatPEN(p.compare)}</span>}</td>
                <td>{current ? <span className="text-violet-300">-{current}%</span> : <span className="text-zinc-500">—</span>}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={80} className="input !w-20 !py-1.5" placeholder="%" value={pct[p.id] ?? ""} onChange={(e) => setPct((s) => ({ ...s, [p.id]: e.target.value }))} />
                    <button
                      disabled={pending || !pct[p.id]}
                      className="btn btn-ghost !px-3 !py-1.5 text-xs"
                      onClick={() => start(async () => { const r = await setOfferAction(p.id, Number(pct[p.id])); if (r.error) alert(r.error); setPct((s) => ({ ...s, [p.id]: "" })); router.refresh(); })}
                    >
                      Aplicar
                    </button>
                    {current > 0 && (
                      <button disabled={pending} className="text-xs text-zinc-400 hover:text-rose-300" onClick={() => start(async () => { await setOfferAction(p.id, 0); router.refresh(); })}>
                        Quitar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
