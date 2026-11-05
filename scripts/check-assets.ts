/**
 * Verifica que cada producto del catálogo tenga todas sus imágenes y que sean válidas.
 * Uso: npx tsx scripts/check-assets.ts
 */
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { seedProducts } from "../lib/seed-catalog";

const root = join(__dirname, "..");
let errors = 0;
let total = 0;
const sizes: number[] = [];

async function main() {
  for (const p of seedProducts) {
    const colors = [...new Set(p.variants.map((v) => v.color_name))];
    for (const c of colors) {
      if (!p.images.some((i) => i.color_name === c)) {
        console.log(`✗ ${p.slug}: el color «${c}» no tiene imágenes`);
        errors++;
      }
    }
    for (const img of p.images) {
      total++;
      const file = join(root, "public", img.url);
      if (!existsSync(file)) {
        console.log(`✗ Falta ${img.url}`);
        errors++;
        continue;
      }
      const meta = await sharp(file).metadata();
      const stats = await sharp(file).stats();
      const bytes = statSync(file).size;
      sizes.push(bytes);
      const problems: string[] = [];
      if (meta.format !== "webp") problems.push(`formato ${meta.format}`);
      if ((meta.height ?? 0) < 800) problems.push(`alto ${meta.height}px (< 800)`);
      if (!meta.hasAlpha) problems.push("sin transparencia");
      if (stats.isOpaque) problems.push("fondo opaco");
      // Imagen "vacía": casi sin contenido visible
      const alpha = stats.channels[3];
      if (alpha && alpha.mean < 8) problems.push("casi vacía");
      if (bytes < 4000) problems.push(`${bytes} bytes`);
      if (problems.length) {
        console.log(`✗ ${img.url}: ${problems.join(", ")}`);
        errors++;
      }
    }
  }
  const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`\n${seedProducts.length} productos · ${total} imágenes · tamaño medio ${kb(sizes.reduce((a, b) => a + b, 0) / Math.max(1, sizes.length))} · máx. ${kb(Math.max(...sizes))}`);
  console.log(errors ? `${errors} problema(s)` : "Todas las imágenes están completas y son válidas ✔");
  process.exit(errors ? 1 : 0);
}
main();
