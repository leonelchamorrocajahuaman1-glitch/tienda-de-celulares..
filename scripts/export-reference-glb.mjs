/**
 * Exporta el smartphone 3D procedural a GLB estándar (public/models/nexphone-<preset>.glb)
 * y comprueba que el visor de la tienda (GLBPhone) lo carga y renderiza.
 * Requiere `npm run dev` (BASE_URL) y Playwright.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire(import.meta.url)("playwright");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let ok = true;

for (const preset of ["square", "vertical", "circle", "bar"]) {
  await page.goto(`${BASE}/studio?preset=${preset}&view=back&color=%238fa3b8`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__renderReady >= 1, null, { timeout: 120000 });
  const b64 = await page.evaluate(() => window.__exportGLB());
  const buf = Buffer.from(b64, "base64");
  const magic = buf.subarray(0, 4).toString("ascii");
  const file = join(root, "public", "models", `nexphone-${preset}.glb`);
  writeFileSync(file, buf);
  console.log(`${magic === "glTF" ? "✓" : "✗"} GLB exportado: models/nexphone-${preset}.glb (${(buf.length / 1024).toFixed(0)} KB, firma ${magic})`);
  if (magic !== "glTF") ok = false;
}

// Carga del GLB en el visor de la tienda (GLBPhone) y comprobación de que dibuja píxeles
await page.goto(`${BASE}/studio?glb=/models/nexphone-circle.glb&view=back&color=%232f6bff`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__renderReady >= 1, null, { timeout: 120000 });
await page.waitForTimeout(1500);
const coverage = await page.evaluate(() => {
  const c = document.querySelector("#studio canvas");
  const tmp = document.createElement("canvas");
  tmp.width = c.width; tmp.height = c.height;
  const ctx = tmp.getContext("2d");
  ctx.drawImage(c, 0, 0);
  const d = ctx.getImageData(0, 0, tmp.width, tmp.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++;
  return n / (d.length / 4);
});
await page.screenshot({ path: process.env.SHOT ?? join(root, ".glb-check.png") }).catch(() => {});
console.log(`${coverage > 0.05 ? "✓" : "✗"} El visor renderiza el GLB (${(coverage * 100).toFixed(1)}% del lienzo con modelo)`);
if (coverage <= 0.05) ok = false;
console.log(errors.length ? `✗ Errores: ${errors.join(" | ")}` : "✓ Sin errores de JavaScript");
await browser.close();
process.exit(ok && !errors.length ? 0 : 1);
