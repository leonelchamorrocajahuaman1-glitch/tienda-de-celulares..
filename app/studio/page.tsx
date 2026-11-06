import { notFound } from "next/navigation";
import { StudioRender } from "./StudioRender";

export const metadata = { robots: { index: false } };

/**
 * Estudio de render (solo desarrollo): genera las fotografías de producto
 * a partir del modelo 3D. Usado por scripts/render-products.mjs.
 */
export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_RENDER_STUDIO !== "1") notFound();
  const sp = await searchParams;
  const preset = (["square", "vertical", "circle", "bar"].includes(sp.preset ?? "") ? sp.preset : "square") as
    | "square"
    | "vertical"
    | "circle"
    | "bar";
  const view = (["front", "back", "side"].includes(sp.view ?? "") ? sp.view : "front") as "front" | "back" | "side";
  const color = /^#[0-9a-fA-F]{6}$/.test(sp.color ?? "") ? sp.color! : "#8fa3b8";
  const glb = sp.glb && /^\/models\/[a-z0-9-]+\.glb$/.test(sp.glb) ? sp.glb : undefined;
  return <StudioRender preset={preset} view={view} color={color} glb={glb} floor={sp.floor === "1"} />;
}
