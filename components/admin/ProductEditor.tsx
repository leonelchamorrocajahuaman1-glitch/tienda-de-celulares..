"use client";

import { Copy, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProductAction, saveProductAction } from "@/app/admin/actions";
import { slugify } from "@/lib/catalog-data";
import { cn } from "@/lib/utils";

export interface EditorVariant {
  id?: string;
  sku: string;
  color_name: string;
  color_hex: string;
  ram_gb: number;
  storage_gb: number;
  price: number | "";
  compare_at_price: number | "";
  cost_price: number | "";
  is_default: boolean;
  is_active: boolean;
  stock?: number;
  initial_stock?: number | "";
}

export interface EditorProduct {
  id?: string;
  slug: string;
  name: string;
  brand_id: string;
  category_id: string | null;
  model: string;
  tagline: string;
  description: string;
  processor: string;
  display: string;
  camera: string;
  battery: string;
  os: string;
  extra_specs: Record<string, string>;
  model_preset: "square" | "vertical" | "circle" | "bar";
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  release_date: string | null;
  variants: EditorVariant[];
}

const EMPTY_VARIANT: EditorVariant = {
  sku: "",
  color_name: "",
  color_hex: "#8fa3b8",
  ram_gb: 8,
  storage_gb: 256,
  price: "",
  compare_at_price: "",
  cost_price: "",
  is_default: false,
  is_active: true,
  initial_stock: 0,
};

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function ProductEditor({
  initial,
  brands,
  categories,
}: {
  initial: EditorProduct;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [p, setP] = useState<EditorProduct>(initial);
  const [specs, setSpecs] = useState<[string, string][]>(Object.entries(initial.extra_specs));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.id));

  const set = <K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) => setP((s) => ({ ...s, [k]: v }));
  const setVariant = (i: number, patch: Partial<EditorVariant>) =>
    setP((s) => ({
      ...s,
      variants: s.variants.map((v, j) => {
        if (patch.is_default && j !== i) return { ...v, is_default: false };
        if (j !== i) return v;
        const next = { ...v, ...patch };
        if (!v.id && ("color_name" in patch || "ram_gb" in patch || "storage_gb" in patch) && (!v.sku || v.sku.startsWith(s.slug.toUpperCase()))) {
          next.sku = `${s.slug}-${slugify(next.color_name)}-${next.ram_gb}-${next.storage_gb}`.toUpperCase().slice(0, 60);
        }
        return next;
      }),
    }));

  const save = () => {
    setMsg(null);
    start(async () => {
      const payload = {
        ...p,
        tagline: p.tagline || null,
        release_date: p.release_date || null,
        extra_specs: Object.fromEntries(specs.filter(([k, v]) => k.trim() && v.trim())),
        variants: p.variants.map((v) => ({
          ...v,
          price: v.price === "" ? -1 : v.price,
          compare_at_price: v.compare_at_price === "" ? null : v.compare_at_price,
          cost_price: v.cost_price === "" ? null : v.cost_price,
          initial_stock: v.id ? undefined : v.initial_stock === "" ? 0 : v.initial_stock,
        })),
      };
      const res = await saveProductAction(payload);
      if (res.error) return setMsg({ ok: false, text: res.error });
      setMsg({ ok: true, text: "Producto guardado" });
      if (!p.id && res.data) router.replace(`/admin/productos/${res.data.id}`);
      else router.refresh();
    });
  };

  const remove = () => {
    if (!p.id || !confirm("¿Eliminar este producto? Si tiene ventas, se desactivará en lugar de eliminarse.")) return;
    start(async () => {
      const res = await deleteProductAction(p.id!);
      if (res.error) return setMsg({ ok: false, text: res.error });
      if (res.data?.deactivated) {
        setMsg({ ok: true, text: "El producto tiene ventas: se desactivó para preservar el historial." });
        router.refresh();
      } else router.replace("/admin/productos");
    });
  };

  return (
    <div className="space-y-6">
      <section className="card grid gap-4 p-6 md:grid-cols-2">
        <h2 className="font-display text-lg font-semibold md:col-span-2">Información general</h2>
        <Field label="Nombre">
          <input
            className="input"
            value={p.name}
            maxLength={120}
            onChange={(e) => {
              set("name", e.target.value);
              if (!slugTouched) set("slug", slugify(e.target.value));
            }}
          />
        </Field>
        <Field label="Slug (URL)">
          <input className="input font-mono" value={p.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
        </Field>
        <Field label="Marca">
          <select className="input" value={p.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
            <option value="" disabled>Selecciona</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="Categoría">
          <select className="input" value={p.category_id ?? ""} onChange={(e) => set("category_id", e.target.value || null)}>
            <option value="">Sin categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Modelo / código">
          <input className="input" value={p.model} maxLength={80} onChange={(e) => set("model", e.target.value)} />
        </Field>
        <Field label="Fecha de lanzamiento">
          <input type="date" className="input" value={p.release_date ?? ""} onChange={(e) => set("release_date", e.target.value || null)} />
        </Field>
        <Field label="Frase corta" className="md:col-span-2">
          <input className="input" value={p.tagline} maxLength={160} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Descripción" className="md:col-span-2">
          <textarea className="input min-h-28" value={p.description} maxLength={5000} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-5 md:col-span-2">
          {(
            [
              ["is_active", "Publicado"],
              ["is_featured", "Destacado"],
              ["is_new", "Nuevo lanzamiento"],
              ["is_bestseller", "Más vendido"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={p[k]} onChange={(e) => set(k, e.target.checked)} />
              {l}
            </label>
          ))}
        </div>
      </section>

      <section className="card grid gap-4 p-6 md:grid-cols-2">
        <h2 className="font-display text-lg font-semibold md:col-span-2">Especificaciones técnicas</h2>
        <Field label="Procesador"><input className="input" value={p.processor} onChange={(e) => set("processor", e.target.value)} /></Field>
        <Field label="Pantalla"><input className="input" value={p.display} onChange={(e) => set("display", e.target.value)} /></Field>
        <Field label="Cámara"><input className="input" value={p.camera} onChange={(e) => set("camera", e.target.value)} /></Field>
        <Field label="Batería"><input className="input" value={p.battery} onChange={(e) => set("battery", e.target.value)} /></Field>
        <Field label="Sistema operativo"><input className="input" value={p.os} onChange={(e) => set("os", e.target.value)} /></Field>
        <Field label="Módulo de cámara del modelo 3D procedural">
          <select className="input" value={p.model_preset} onChange={(e) => set("model_preset", e.target.value as EditorProduct["model_preset"])}>
            <option value="square">Cuadrado (3 lentes)</option>
            <option value="vertical">Vertical (lentes en columna)</option>
            <option value="circle">Circular</option>
            <option value="bar">Barra horizontal</option>
          </select>
        </Field>
        <div className="md:col-span-2">
          <p className="label">Especificaciones adicionales</p>
          <div className="space-y-2">
            {specs.map(([k, v], i) => (
              <div key={i} className="flex gap-2">
                <input className="input" placeholder="Nombre (ej. Resistencia)" value={k} maxLength={60} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
                <input className="input" placeholder="Valor (ej. IP68)" value={v} maxLength={200} onChange={(e) => setSpecs((s) => s.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
                <button type="button" className="rounded-xl px-3 text-zinc-400 hover:bg-white/5 hover:text-rose-300" onClick={() => setSpecs((s) => s.filter((_, j) => j !== i))} aria-label="Quitar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost !py-2" onClick={() => setSpecs((s) => [...s, ["", ""]])}>
              <Plus className="h-4 w-4" /> Agregar especificación
            </button>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Variantes y precios</h2>
            <p className="text-xs text-zinc-500">Cada combinación de color, RAM y almacenamiento. Precios en soles con IGV. El stock se gestiona en Inventario.</p>
          </div>
          <button type="button" className="btn btn-ghost !py-2" onClick={() => setP((s) => ({ ...s, variants: [...s.variants, { ...EMPTY_VARIANT, is_default: s.variants.length === 0 }] }))}>
            <Plus className="h-4 w-4" /> Variante
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm [&_td]:p-1.5 [&_th]:p-1.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium [&_th]:text-zinc-500">
            <thead>
              <tr>
                <th>Color</th><th>HEX</th><th>RAM</th><th>Almac. (GB)</th><th>Precio</th><th>Precio anterior</th><th>Costo</th><th>SKU</th><th>Stock</th><th>Pred.</th><th>Activa</th><th />
              </tr>
            </thead>
            <tbody>
              {p.variants.map((v, i) => (
                <tr key={v.id ?? `new-${i}`} className={cn(!v.is_active && "opacity-50")}>
                  <td><input className="input !py-2" value={v.color_name} maxLength={40} onChange={(e) => setVariant(i, { color_name: e.target.value })} /></td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <input type="color" className="h-9 w-9 cursor-pointer rounded-lg border border-white/10 bg-transparent" value={v.color_hex} onChange={(e) => setVariant(i, { color_hex: e.target.value })} aria-label="Color" />
                      <input className="input !w-24 !py-2 font-mono text-xs" value={v.color_hex} onChange={(e) => setVariant(i, { color_hex: e.target.value })} />
                    </div>
                  </td>
                  <td><input type="number" min={1} max={64} className="input !w-20 !py-2" value={v.ram_gb} onChange={(e) => setVariant(i, { ram_gb: Number(e.target.value) })} /></td>
                  <td><input type="number" min={8} max={4096} className="input !w-24 !py-2" value={v.storage_gb} onChange={(e) => setVariant(i, { storage_gb: Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step="0.01" className="input !w-28 !py-2" value={v.price} onChange={(e) => setVariant(i, { price: e.target.value === "" ? "" : Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step="0.01" className="input !w-28 !py-2" value={v.compare_at_price} placeholder="—" onChange={(e) => setVariant(i, { compare_at_price: e.target.value === "" ? "" : Number(e.target.value) })} /></td>
                  <td><input type="number" min={0} step="0.01" className="input !w-28 !py-2" value={v.cost_price} placeholder="—" onChange={(e) => setVariant(i, { cost_price: e.target.value === "" ? "" : Number(e.target.value) })} /></td>
                  <td><input className="input !w-56 !py-2 font-mono text-xs" value={v.sku} maxLength={60} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} /></td>
                  <td>
                    {v.id ? (
                      <span className="px-2 font-mono">{v.stock ?? 0}</span>
                    ) : (
                      <input type="number" min={0} className="input !w-20 !py-2" title="Stock inicial" value={v.initial_stock ?? 0} onChange={(e) => setVariant(i, { initial_stock: e.target.value === "" ? "" : Number(e.target.value) })} />
                    )}
                  </td>
                  <td className="text-center"><input type="radio" name="default-variant" className="h-4 w-4 accent-cyan-400" checked={v.is_default} onChange={() => setVariant(i, { is_default: true })} /></td>
                  <td className="text-center"><input type="checkbox" className="h-4 w-4 accent-cyan-400" checked={v.is_active} onChange={(e) => setVariant(i, { is_active: e.target.checked })} /></td>
                  <td>
                    <div className="flex">
                      <button type="button" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5" title="Duplicar" onClick={() => setP((s) => ({ ...s, variants: [...s.variants.slice(0, i + 1), { ...v, id: undefined, sku: "", is_default: false, initial_stock: 0, stock: undefined }, ...s.variants.slice(i + 1)] }))}>
                        <Copy className="h-4 w-4" />
                      </button>
                      <button type="button" className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-rose-300" title="Quitar" onClick={() => setP((s) => ({ ...s, variants: s.variants.filter((_, j) => j !== i) }))}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/90 p-3 backdrop-blur">
        <button onClick={save} disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {p.id ? "Guardar cambios" : "Crear producto"}
        </button>
        {p.id && (
          <button onClick={remove} disabled={pending} className="btn btn-danger">
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        )}
        {msg && <p role="status" className={cn("text-sm", msg.ok ? "text-emerald-300" : "text-rose-300")}>{msg.text}</p>}
      </div>
    </div>
  );
}
