/**
 * Genera fotografías de producto (WEBP transparentes) desde el modelo 3D.
 * Requiere el servidor en marcha: `npm run dev` y luego `npm run render:products`.
 * Variables: BASE_URL (por defecto http://localhost:3000), ONLY=<slug>
 */
import { createRequire as cr } from "node:module"; const { chromium } = cr(import.meta.url)("playwright");
import sharp from "sharp";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const { register } = require("tsx/cjs/api");
register();
const { SEED_PRODUCTS, RENDER_VIEWS, renderPath } = require("../lib/catalog-data.ts");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 1 });

let count = 0;
await page.goto(`${BASE}/studio`, { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__renderReady === 1, null, { timeout: 120000 });
let shotId = 1;
for (const p of SEED_PRODUCTS) {
  if (process.env.ONLY && p.slug !== process.env.ONLY) continue;
  for (const c of p.colors) {
    for (const view of RENDER_VIEWS) {
      const out = join(root, "public", renderPath(p.slug, c.name, view));
      if (existsSync(out) && !process.env.FORCE) continue;
      mkdirSync(dirname(out), { recursive: true });
      shotId++;
      await page.evaluate((s) => window.__setShot(s), { preset: p.preset, view, color: c.hex });
      await page.waitForFunction((id) => window.__renderReady === id, shotId, { timeout: 120000 });
      const png = Buffer.from((await page.evaluate(() => document.querySelector("#studio canvas").toDataURL("image/png"))).split(",")[1], "base64");
      await sharp(png)
        .trim({ threshold: 2 })
        .extend({ top: 40, bottom: 40, left: 60, right: 60, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .resize({ height: 900, fit: "inside" })
        .webp({ quality: 84, alphaQuality: 90 })
        .toFile(out);
      count++;
      console.log("✓", out.replace(root, ""));
    }
  }
}
await browser.close();
console.log(`Renders generados: ${count}`);
