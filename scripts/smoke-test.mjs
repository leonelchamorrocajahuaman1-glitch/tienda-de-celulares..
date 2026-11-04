/**
 * Prueba de humo E2E (Playwright) sobre la tienda en ejecución.
 * Uso: BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
 * Requiere playwright instalado (npm i -D playwright && npx playwright install chromium).
 */
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
const check = (ok, label) => {
  results.push([ok, label]);
  console.log(`${ok ? "✓" : "✗"} ${label}`);
};

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

// Portada
await page.goto(BASE, { waitUntil: "networkidle" });
check(await page.getByRole("heading", { level: 1 }).innerText().then((t) => /FUTURE/.test(t)), "Portada muestra THE FUTURE IN YOUR HANDS");
check((await page.locator("canvas").count()) > 0, "Portada renderiza el smartphone 3D (canvas WebGL)");
await page.getByRole("link", { name: /EXPLORAR COLECCIÓN/ }).click();
await page.waitForURL(/\/catalogo/);
check(true, "Botón EXPLORAR COLECCIÓN navega al catálogo");

// Catálogo y filtros
const total = await page.locator("article").count();
await page.getByLabel(/Apple/).first().click();
await page.waitForURL(/brand=apple/);
await page.waitForTimeout(800);
const apple = await page.locator("article").count();
check(apple > 0 && apple < total, `Filtro por marca (${total} → ${apple})`);
await page.goto(`${BASE}/catalogo?offers=1`, { waitUntil: "networkidle" });
check((await page.locator("article").count()) > 0, "Filtro de ofertas devuelve productos");

// Producto: variante, cantidad y carrito
await page.goto(`${BASE}/producto/galaxy-s25-ultra`, { waitUntil: "networkidle" });
const price1 = await page.locator("p.font-display.text-4xl").first().innerText();
await page.getByRole("button", { name: /512 GB/ }).click();
const price2 = await page.locator("p.font-display.text-4xl").first().innerText();
check(price1 !== price2, `Cambio de variante actualiza el precio (${price1} → ${price2})`);
await page.getByRole("radio", { name: "Titanio Negro" }).click();
await page.getByRole("button", { name: "Aumentar cantidad" }).click();
await page.getByRole("button", { name: /Agregar al carrito/ }).click();
await page.getByRole("dialog", { name: "Carrito de compras" }).waitFor();
check(await page.getByRole("dialog").getByText("Titanio Negro").isVisible(), "Carrito recibe la variante elegida");
const qty = await page.getByRole("dialog").locator("[aria-live=polite]").first().innerText();
check(qty.trim() === "2", "Cantidad seleccionada se respeta (2)");
await page.getByRole("button", { name: "Cerrar carrito" }).click();

// Página de carrito
await page.goto(`${BASE}/carrito`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Disminuir cantidad" }).first().click();
check((await page.locator("[aria-live=polite]").first().innerText()).trim() === "1", "Modificar cantidad en el carrito");
await page.getByRole("link", { name: /Continuar compra/ }).click();
await page.waitForURL(/ingresar|checkout/);
check(/ingresar/.test(page.url()) || /checkout/.test(page.url()), "Checkout exige sesión (redirige a ingresar sin Supabase/sesión)");

// Rutas protegidas
const r = await page.goto(`${BASE}/admin`);
check(/ingresar/.test(page.url()) || r.status() === 404, "Panel /admin protegido");

check(errors.length === 0, `Sin errores de JavaScript (${errors.length})`);
if (errors.length) console.log(errors.slice(0, 5));
await browser.close();
const failed = results.filter(([ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} comprobaciones OK`);
process.exit(failed ? 1 : 0);
