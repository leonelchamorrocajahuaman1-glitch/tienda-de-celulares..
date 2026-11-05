/**
 * Rastreo del sitio en ejecución: enlaces internos rotos, imágenes rotas, errores de consola
 * y desbordes horizontales en móvil (390 px) y escritorio (1440 px).
 * Uso: BASE_URL=http://localhost:3000 node scripts/check-site.mjs
 */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const START = ["/", "/catalogo", "/producto/iphone-17-pro-max", "/producto/galaxy-z-fold7", "/carrito", "/ingresar", "/registro", "/recuperar", "/legal/terminos"];
const PROTECTED = ["/cuenta", "/checkout", "/admin", "/comprobante"];
let problems = 0;
const report = (msg) => {
  problems++;
  console.log(`✗ ${msg}`);
};

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const links = new Set();

for (const vp of [{ name: "móvil", width: 390, height: 844 }, { name: "escritorio", width: 1440, height: 900 }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const path of START) {
    errors.length = 0;
    const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(2500);
    if (!res || res.status() >= 400) report(`[${vp.name}] ${path} respondió ${res?.status()}`);
    const info = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src")),
      hrefs: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")),
    }));
    if (info.overflow > 1) report(`[${vp.name}] ${path}: desborde horizontal de ${info.overflow}px`);
    info.broken.forEach((b) => report(`[${vp.name}] ${path}: imagen rota ${b}`));
    errors.forEach((e) => report(`[${vp.name}] ${path}: error de consola: ${e.slice(0, 160)}`));
    info.hrefs.filter((h) => h && h.startsWith("/") && !h.startsWith("//")).forEach((h) => links.add(h.split("#")[0] || "/"));
    console.log(`✓ [${vp.name}] ${path}`);
  }
  await page.close();
}
await browser.close();

for (const href of [...links].sort()) {
  const res = await fetch(BASE + href, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  const isProtected = PROTECTED.some((p) => href === p || href.startsWith(`${p}/`) || href.startsWith(`${p}?`));
  if (res.status >= 400) report(`Enlace roto ${href} (${res.status})`);
  else if (res.status >= 300 && !(isProtected && loc.includes("/ingresar"))) report(`Redirección inesperada ${href} → ${loc}`);
}
console.log(`\n${links.size} enlaces internos revisados · ${problems ? `${problems} problema(s)` : "sin problemas ✔"}`);
process.exit(problems ? 1 : 0);
