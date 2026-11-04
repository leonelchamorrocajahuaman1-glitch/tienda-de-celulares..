"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBrandAction, createCategoryAction, saveSettingsAction } from "@/app/admin/actions";
import { slugify } from "@/lib/catalog-data";
import type { StoreSettings } from "@/lib/types";

export function SettingsForm({ initial }: { initial: StoreSettings }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const F = ({ name, label, type = "text", span }: { name: keyof StoreSettings; label: string; type?: string; span?: boolean }) => (
    <label className={span ? "sm:col-span-2" : ""}>
      <span className="label">{label}</span>
      <input name={name} type={type} step={type === "number" ? "0.01" : undefined} min={type === "number" ? 0 : undefined} defaultValue={String(initial[name] ?? "")} className="input" />
    </label>
  );
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        start(async () => {
          const r = await saveSettingsAction(data);
          setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Configuración guardada" });
          if (!r.error) router.refresh();
        });
      }}
    >
      <h3 className="font-display font-semibold sm:col-span-2">Información comercial</h3>
      <F name="store_name" label="Nombre comercial" />
      <F name="legal_name" label="Razón social" />
      <F name="ruc" label="RUC" />
      <F name="business_hours" label="Horario de atención" />
      <F name="address" label="Dirección de la tienda (recojo)" span />
      <h3 className="mt-2 font-display font-semibold sm:col-span-2">Datos de contacto</h3>
      <F name="email" label="Correo" type="email" />
      <F name="phone" label="Teléfono" />
      <F name="whatsapp" label="WhatsApp" />
      <h3 className="mt-2 font-display font-semibold sm:col-span-2">Envíos (S/)</h3>
      <F name="shipping_standard" label="Envío estándar" type="number" />
      <F name="shipping_express" label="Envío express Lima" type="number" />
      <F name="free_shipping_from" label="Envío estándar gratis desde" type="number" />
      <div />
      <h3 className="mt-2 font-display font-semibold sm:col-span-2">Tienda</h3>
      <label className="sm:col-span-2">
        <span className="label">Datos bancarios para transferencias (visibles para el cliente con pedido pendiente)</span>
        <textarea name="bank_details" defaultValue={initial.bank_details} className="input min-h-24" maxLength={1000} placeholder={"BCP Soles: 000-0000000-0-00\nCCI: 000-000-000000000000-00\nTitular: NEXPHONE S.A.C."} />
      </label>
      <F name="announcement" label="Anuncio superior (vacío = oculto)" span />
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn btn-primary" disabled={pending}>{pending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar configuración</button>
        {msg && <p className={msg.ok ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>{msg.text}</p>}
      </div>
    </form>
  );
}

export function TaxonomyForm({ kind }: { kind: "brand" | "category" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const fn = kind === "brand" ? createBrandAction : createCategoryAction;
          const r = await fn({ name, slug: slugify(name) });
          setMsg(r.error ?? null);
          if (!r.error) {
            setName("");
            router.refresh();
          }
        });
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} className="input max-w-xs" placeholder={kind === "brand" ? "Nueva marca" : "Nueva categoría"} />
      <button className="btn btn-ghost" disabled={pending}>Agregar</button>
      {msg && <p className="w-full text-sm text-rose-300">{msg}</p>}
    </form>
  );
}
