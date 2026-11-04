"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { formatStorage } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Opt {
  value: string;
  label: string;
  count?: number;
}

export function CatalogFilters({
  brands,
  categories,
  rams,
  storages,
  priceBounds,
}: {
  brands: Opt[];
  categories: Opt[];
  rams: number[];
  storages: number[];
  priceBounds: [number, number];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  useEffect(() => {
    setMin(sp.get("min") ?? "");
    setMax(sp.get("max") ?? "");
  }, [sp]);

  const update = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  };
  const toggleList = (key: string, value: string) =>
    update((p) => {
      const cur = (p.get(key) ?? "").split(",").filter(Boolean);
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      if (next.length) p.set(key, next.join(","));
      else p.delete(key);
    });
  const listHas = (key: string, value: string) => (sp.get(key) ?? "").split(",").includes(value);
  const activeCount = ["brand", "category", "min", "max", "ram", "storage", "available", "offers", "q"].filter((k) => sp.get(k)).length;

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs transition",
      active ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-zinc-300 hover:border-white/25",
    );

  const panel = (
    <div className={cn("space-y-7 transition-opacity", pending && "opacity-60")}>
      <fieldset>
        <legend className="label">Marca</legend>
        <div className="space-y-1">
          {brands.map((b) => (
            <label key={b.value} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
              <span className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-400"
                  checked={listHas("brand", b.value)}
                  onChange={() => toggleList("brand", b.value)}
                />
                {b.label}
              </span>
              <span className="text-xs text-zinc-500">{b.count}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Categoría</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.value}
              className={chip(sp.get("category") === c.value)}
              onClick={() => update((p) => (p.get("category") === c.value ? p.delete("category") : p.set("category", c.value)))}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Precio (S/)</legend>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            update((p) => {
              if (min) p.set("min", String(Math.max(0, Number(min)))); else p.delete("min");
              if (max) p.set("max", String(Math.max(0, Number(max)))); else p.delete("max");
            });
          }}
        >
          <input className="input !py-2" inputMode="numeric" type="number" min={0} placeholder={String(priceBounds[0])} value={min} onChange={(e) => setMin(e.target.value)} aria-label="Precio mínimo" />
          <span className="text-zinc-500">—</span>
          <input className="input !py-2" inputMode="numeric" type="number" min={0} placeholder={String(priceBounds[1])} value={max} onChange={(e) => setMax(e.target.value)} aria-label="Precio máximo" />
          <button className="btn btn-ghost !px-3 !py-2" aria-label="Aplicar rango de precio">OK</button>
        </form>
      </fieldset>
      <fieldset>
        <legend className="label">Memoria RAM</legend>
        <div className="flex flex-wrap gap-2">
          {rams.map((r) => (
            <button key={r} className={chip(listHas("ram", String(r)))} onClick={() => toggleList("ram", String(r))}>
              {r} GB
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="label">Almacenamiento</legend>
        <div className="flex flex-wrap gap-2">
          {storages.map((s) => (
            <button key={s} className={chip(listHas("storage", String(s)))} onClick={() => toggleList("storage", String(s))}>
              {formatStorage(s)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="label">Disponibilidad y ofertas</legend>
        {[
          ["available", "Solo con stock"],
          ["offers", "Solo ofertas"],
        ].map(([k, l]) => (
          <label key={k} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-sm">
            {l}
            <input
              type="checkbox"
              className="h-4 w-4 accent-cyan-400"
              checked={sp.get(k) === "1"}
              onChange={() => update((p) => (p.get(k) ? p.delete(k) : p.set(k, "1")))}
            />
          </label>
        ))}
      </fieldset>
      {activeCount > 0 && (
        <button className="btn btn-ghost w-full" onClick={() => start(() => router.replace(pathname, { scroll: false }))}>
          <X className="h-4 w-4" /> Limpiar filtros
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center gap-3 lg:hidden">
        <button className="btn btn-ghost" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> Filtros {activeCount > 0 && `(${activeCount})`}
        </button>
      </div>
      <aside className="hidden lg:block">{panel}</aside>
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute inset-y-0 left-0 w-[86%] max-w-sm overflow-y-auto p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Filtros</h2>
              <button onClick={() => setOpen(false)} aria-label="Cerrar filtros" className="rounded-full p-2 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <select
      aria-label="Ordenar"
      className="input !w-auto !rounded-full !py-2 text-sm"
      value={value}
      onChange={(e) => {
        const p = new URLSearchParams(sp.toString());
        if (e.target.value === "relevance") p.delete("sort");
        else p.set("sort", e.target.value);
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
      }}
    >
      <option value="relevance">Destacados</option>
      <option value="bestsellers">Más vendidos</option>
      <option value="newest">Más recientes</option>
      <option value="price-asc">Precio: menor a mayor</option>
      <option value="price-desc">Precio: mayor a menor</option>
    </select>
  );
}
