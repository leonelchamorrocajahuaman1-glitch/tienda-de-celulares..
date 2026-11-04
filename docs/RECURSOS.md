# Recursos 3D e imágenes

## Qué hay hoy (sin restricciones de licencia)
- **Smartphone 3D procedural** (`components/three/PhoneModel.tsx`): geometría real generada en Three.js — marco metálico, vidrio trasero teñido por variante, pantalla OLED emisiva, botones y cuatro tipos de módulo de cámara (`square`, `vertical`, `circle`, `bar`) con lentes de cristal iridiscente. Iluminación de estudio procedural (sin descargar HDRIs). Es código propio del proyecto, no tiene licencias de terceros.
- **Fotografías de producto** (`public/products/**`): renders WEBP con transparencia generados a partir de ese modelo (`npm run render:products`): vista frontal, posterior y lateral por color.
- **Tipografías** Space Grotesk, Inter y JetBrains Mono vía `@fontsource` (licencia SIL OFL), servidas localmente.
- **Iconos** Lucide (licencia ISC).

No se usaron logotipos ni fotografías de marcas: los renders son genéricos y no reproducen el diseño exacto de ningún fabricante.

## Para un acabado idéntico a cada modelo real
Puedes subirlos desde `/admin/productos/{id}` sin tocar código:

1. **Modelos GLB por producto** (recomendado uno por modelo): escala real, origen centrado, < 10 MB (compresión Draco o meshopt, texturas WEBP de 2K). Si nombras los materiales `body`, `back` o `frame`, el visor aplicará el color de cada variante automáticamente.
   - Fuentes con licencia verificable: Sketchfab (filtrar *Downloadable* + licencia CC-BY o comercial adquirida), CGTrader/TurboSquid (licencia *Royalty Free* que permita uso web/comercial). Revisa que la licencia permita uso comercial en un sitio web y conserva la atribución si es CC-BY (puedes ponerla en la descripción del producto).
2. **Fotografías oficiales**: los kits de prensa de los fabricantes suelen permitir el uso a distribuidores autorizados; confirma con tu proveedor/distribuidor antes de usarlas.

### Si prefieres generarlas con ChatGPT o Gemini
Pide, por producto y color, imágenes de **1200×1500 px, fondo transparente o gris muy oscuro (#0a0c12), iluminación de estudio suave, vista 3/4 frontal, 3/4 posterior y lateral**, sin logotipos de marca ni texto. Ejemplo de prompt:

> Fotografía de producto de un smartphone premium color «Azul Profundo», vista posterior 3/4, módulo de tres cámaras en la esquina superior, marco de titanio pulido, fondo negro profundo con luz de borde azul eléctrico y cian, estilo catálogo minimalista, sin logotipos ni texto, 1200×1500.

Además, opcionalmente: **imagen OG** 1200×630 para redes sociales (la portada con el lema *THE FUTURE IN YOUR HANDS*). Súbelas desde el panel; no es necesario cambiar código.
