"use client";

import { Box, ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { addImagesAction, deleteImageAction, setModelAction, updateImageAction } from "@/app/admin/actions";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ModelPreview = dynamic(() => import("@/components/admin/ModelPreview"), { ssr: false });

const IMG_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const IMG_MAX = 5 * 1024 * 1024;
const MODEL_MAX = 30 * 1024 * 1024;
const SAFE_NAME = /^[A-Za-z0-9._-]{1,120}$/;

/** Verifica la firma real del archivo (no solo la extensión). */
async function sniff(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b[0] === 0x67 && b[1] === 0x6c && b[2] === 0x54 && b[3] === 0x46) return "model/gltf-binary";
  return null;
}

interface PendingImage {
  file: File;
  url: string;
  type: string;
}
interface ExistingImage {
  id: string;
  url: string;
  alt: string;
  color_name: string | null;
  position: number;
}
interface PendingModel {
  main: File;
  files: File[];
  kind: "glb" | "gltf";
  urlMap: Record<string, string>;
}

export function MediaManager({
  productId,
  productName,
  colors,
  images,
  modelUrl,
  previewColor,
}: {
  productId: string;
  productName: string;
  colors: string[];
  images: ExistingImage[];
  modelUrl: string | null;
  previewColor: string;
}) {
  const router = useRouter();
  const sb = getBrowserSupabase();
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [color, setColor] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [model, setModel] = useState<PendingModel | null>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const modelInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      pending.forEach((p) => URL.revokeObjectURL(p.url));
    },
    [pending],
  );
  useEffect(
    () => () => {
      if (model) Object.values(model.urlMap).forEach((u) => URL.revokeObjectURL(u));
    },
    [model],
  );

  const pickImages = async (files: FileList | null) => {
    if (!files) return;
    setMsg(null);
    const ok: PendingImage[] = [];
    for (const f of Array.from(files).slice(0, 20)) {
      const real = await sniff(f);
      if (!real || !IMG_TYPES[real]) {
        setMsg({ ok: false, text: `${f.name}: formato no permitido (solo JPG, PNG o WEBP reales).` });
        continue;
      }
      if (f.size > IMG_MAX) {
        setMsg({ ok: false, text: `${f.name}: supera 5 MB.` });
        continue;
      }
      ok.push({ file: f, url: URL.createObjectURL(f), type: real });
    }
    setPending((p) => [...p, ...ok].slice(0, 20));
  };

  const publishImages = async () => {
    if (!sb || !pending.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const rows = [];
      for (const p of pending) {
        const path = `${productId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${IMG_TYPES[p.type]}`;
        const { error } = await sb.storage.from("product-images").upload(path, p.file, { contentType: p.type, cacheControl: "31536000", upsert: false });
        if (error) throw new Error(`No se pudo subir ${p.file.name}: ${error.message}`);
        const { data } = sb.storage.from("product-images").getPublicUrl(path);
        rows.push({ product_id: productId, url: data.publicUrl, storage_path: path, alt: `${productName}${color ? ` ${color}` : ""}`, color_name: color || null });
      }
      const res = await addImagesAction(rows);
      if (res.error) throw new Error(res.error);
      setPending([]);
      setMsg({ ok: true, text: `${rows.length} imagen(es) publicadas` });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const pickModel = async (files: FileList | null) => {
    if (!files?.length) return;
    setMsg(null);
    const list = Array.from(files);
    const total = list.reduce((s, f) => s + f.size, 0);
    if (total > MODEL_MAX) return setMsg({ ok: false, text: "El modelo supera los 30 MB. Optimízalo (Draco/meshopt, texturas WEBP)." });
    const bad = list.find((f) => !SAFE_NAME.test(f.name));
    if (bad) return setMsg({ ok: false, text: `Nombre de archivo no válido: ${bad.name} (usa letras, números, punto, guion).` });
    const glb = list.find((f) => /\.glb$/i.test(f.name));
    const gltf = list.find((f) => /\.gltf$/i.test(f.name));
    const urlMap: Record<string, string> = {};
    if (glb) {
      if (list.length > 1) return setMsg({ ok: false, text: "Un GLB es autocontenido: selecciona solo el archivo .glb." });
      if ((await sniff(glb)) !== "model/gltf-binary") return setMsg({ ok: false, text: "El archivo no es un GLB válido (firma glTF ausente)." });
      urlMap[glb.name] = URL.createObjectURL(glb);
      return setModel({ main: glb, files: [glb], kind: "glb", urlMap });
    }
    if (!gltf) return setMsg({ ok: false, text: "Selecciona un .glb, o un .gltf junto con sus archivos .bin y texturas." });
    let json: { buffers?: { uri?: string }[]; images?: { uri?: string }[] };
    try {
      json = JSON.parse(await gltf.text());
    } catch {
      return setMsg({ ok: false, text: "El .gltf no es un JSON válido." });
    }
    const refs = [...(json.buffers ?? []), ...(json.images ?? [])]
      .map((r) => r.uri)
      .filter((u): u is string => Boolean(u) && !u!.startsWith("data:"))
      .map((u) => decodeURIComponent(u));
    const names = new Set(list.map((f) => f.name));
    const missing = refs.filter((r) => !names.has(r));
    if (missing.length) return setMsg({ ok: false, text: `Faltan archivos del conjunto GLTF: ${missing.join(", ")}` });
    if (refs.some((r) => r.includes("/") || r.includes(".."))) return setMsg({ ok: false, text: "El GLTF referencia rutas en subcarpetas; colócalos en una sola carpeta." });
    const allowedExt = /\.(gltf|bin|png|jpe?g|webp)$/i;
    const extra = list.find((f) => !allowedExt.test(f.name));
    if (extra) return setMsg({ ok: false, text: `Tipo de archivo no permitido en el conjunto: ${extra.name}` });
    list.forEach((f) => (urlMap[f.name] = URL.createObjectURL(f)));
    setModel({ main: gltf, files: list, kind: "gltf", urlMap });
  };

  const publishModel = async () => {
    if (!sb || !model) return;
    setBusy(true);
    setMsg(null);
    try {
      const folder = `${productId}/${Date.now()}`;
      for (const f of model.files) {
        const ct = /\.glb$/i.test(f.name)
          ? "model/gltf-binary"
          : /\.gltf$/i.test(f.name)
            ? "model/gltf+json"
            : /\.bin$/i.test(f.name)
              ? "application/octet-stream"
              : /\.png$/i.test(f.name)
                ? "image/png"
                : /\.webp$/i.test(f.name)
                  ? "image/webp"
                  : "image/jpeg";
        const { error } = await sb.storage.from("product-models").upload(`${folder}/${f.name}`, f, { contentType: ct, cacheControl: "31536000" });
        if (error) throw new Error(`No se pudo subir ${f.name}: ${error.message}`);
      }
      const { data } = sb.storage.from("product-models").getPublicUrl(`${folder}/${model.main.name}`);
      const res = await setModelAction(productId, data.publicUrl);
      if (res.error) throw new Error(res.error);
      setModel(null);
      setMsg({ ok: true, text: "Modelo 3D publicado" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (!sb) return <p className="card p-6 text-sm text-amber-200">Configura Supabase para subir imágenes y modelos.</p>;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Fotografías</h2>
          <button className="btn btn-ghost !py-2" onClick={() => imgInput.current?.click()}>
            <ImagePlus className="h-4 w-4" /> Seleccionar
          </button>
          <input ref={imgInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { pickImages(e.target.files); e.target.value = ""; }} />
        </div>
        <p className="mb-4 text-xs text-zinc-500">JPG, PNG o WEBP · máx. 5 MB c/u · se recomienda fondo transparente o neutro, 1200 px de alto.</p>

        {pending.length > 0 && (
          <div className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-400/[0.04] p-4">
            <p className="mb-3 text-sm font-medium">Vista previa ({pending.length}) — aún no publicadas</p>
            <div className="grid grid-cols-4 gap-2">
              {pending.map((p, i) => (
                <div key={p.url} className="relative aspect-square overflow-hidden rounded-xl bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-contain" />
                  <button onClick={() => setPending((s) => s.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1" aria-label="Quitar">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select className="input !w-auto !py-2" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Asociar a color">
                <option value="">Todas las variantes</option>
                {colors.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button onClick={publishImages} disabled={busy} className="btn btn-primary !py-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Publicar imágenes
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((im) => (
            <div key={im.id} className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <div className="relative aspect-square">
                <Image src={im.url} alt={im.alt} fill sizes="120px" className="object-contain" />
              </div>
              <select
                className="mt-1 w-full rounded-lg bg-transparent text-[0.65rem] text-zinc-400"
                defaultValue={im.color_name ?? ""}
                onChange={async (e) => {
                  await updateImageAction(im.id, { color_name: e.target.value || null });
                  router.refresh();
                }}
                aria-label="Color de la imagen"
              >
                <option value="">Todas</option>
                {colors.map((c) => <option key={c}>{c}</option>)}
              </select>
              <button
                onClick={async () => {
                  if (!confirm("¿Eliminar imagen?")) return;
                  const r = await deleteImageAction(im.id);
                  if (r.error) setMsg({ ok: false, text: r.error });
                  router.refresh();
                }}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1.5 opacity-0 transition group-hover:opacity-100"
                aria-label="Eliminar imagen"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-300" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Modelo 3D</h2>
          <button className="btn btn-ghost !py-2" onClick={() => modelInput.current?.click()}>
            <Box className="h-4 w-4" /> Seleccionar GLB / GLTF
          </button>
          <input ref={modelInput} type="file" accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp" multiple hidden onChange={(e) => { pickModel(e.target.files); e.target.value = ""; }} />
        </div>
        <p className="mb-4 text-xs text-zinc-500">
          GLB (recomendado) o GLTF con sus .bin y texturas · máx. 30 MB. Si los materiales se llaman “body”, “back” o “frame”, el color de la variante se aplicará automáticamente.
          Sin modelo, la tienda usa el smartphone 3D procedural.
        </p>
        <div className={cn("relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(47,107,255,0.15),transparent_65%)]")}>
          {model ? (
            <ModelPreview url={model.urlMap[model.main.name]} urlMap={model.urlMap} color={previewColor} />
          ) : modelUrl ? (
            <ModelPreview url={modelUrl} color={previewColor} />
          ) : (
            <p className="grid h-full place-items-center text-sm text-zinc-500">Sin modelo subido (usando modelo procedural)</p>
          )}
          {model && <span className="absolute left-3 top-3 rounded-full bg-cyan-400/20 px-2.5 py-1 text-xs text-cyan-200">Vista previa local</span>}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {model && (
            <>
              <button onClick={publishModel} disabled={busy} className="btn btn-primary !py-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Publicar modelo
              </button>
              <button onClick={() => setModel(null)} className="btn btn-ghost !py-2">Descartar</button>
            </>
          )}
          {!model && modelUrl && (
            <button
              onClick={async () => {
                if (!confirm("¿Quitar el modelo 3D? Se usará el modelo procedural.")) return;
                await setModelAction(productId, null);
                router.refresh();
              }}
              className="btn btn-danger !py-2"
            >
              <Trash2 className="h-4 w-4" /> Quitar modelo
            </button>
          )}
        </div>
      </section>
      {msg && <p role="status" className={cn("text-sm xl:col-span-2", msg.ok ? "text-emerald-300" : "text-rose-300")}>{msg.text}</p>}
    </div>
  );
}
