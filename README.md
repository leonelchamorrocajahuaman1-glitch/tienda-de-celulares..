# NEXPHONE — Future Smartphone Store

Tienda virtual premium de smartphones para Perú (moneda **S/**), con experiencia 3D en tiempo real,
animaciones GSAP, panel administrativo independiente y backend Supabase con seguridad a nivel de base de datos.

| Área | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) · React 19 · TypeScript |
| Estilos | Tailwind CSS 4 · glassmorphism · tipografías Space Grotesk / Inter / JetBrains Mono (locales) |
| 3D | Three.js · React Three Fiber · Drei (modelo procedural + carga de GLB/GLTF) |
| Animación | GSAP 3.13 + ScrollTrigger (escenas por scroll) · Framer Motion (microinteracciones de UI) |
| Backend | Supabase: PostgreSQL, Auth, Row Level Security, Storage |
| Pagos | Mercado Pago Checkout Pro (modo pruebas) · transferencia y pago en tienda con confirmación manual |
| Despliegue | Vercel |

## Qué incluye

**Tienda (cliente)**
- Portada con smartphone 3D protagonista flotando en un escenario; GSAP ScrollTrigger lo gira (frente → cámaras → perfil) mientras cambian los textos. Selector de color en vivo.
- Marcas destacadas, más vendidos, nuevos lanzamientos, ofertas, tecnología, recomendados, footer.
- Catálogo con filtros por marca, categoría, precio, RAM, almacenamiento, disponibilidad y ofertas + orden y búsqueda.
- Ficha de producto: visor 3D (rotación 360°, zoom, vistas frente/atrás/lateral, cambio de color), galería, variantes (color + RAM/almacenamiento) que actualizan precio, stock e imágenes, especificaciones, relacionados y datos estructurados (SEO).
- Carrito (persistente; se sincroniza con la cuenta al iniciar sesión), cupones, checkout con dirección, entrega, pago y boleta/factura.
- Cuenta: registro, inicio de sesión, recuperación de contraseña, perfil, direcciones, historial, seguimiento, cancelación de pedidos pendientes, comprobantes imprimibles/descargables (PDF desde el navegador).

**Panel administrativo (`/admin`)**
Dashboard (ventas, ganancias estimadas, pedidos, productos, clientes, gráficos, más vendidos, actividad), Productos (CRUD, variantes, especificaciones, subida de imágenes y modelos 3D con vista previa), Inventario (stock, alertas, ajustes, historial), Pedidos (estados, entregas, confirmación de pagos manuales, comprobantes, notas internas), Clientes, Pagos, Promociones (cupones y ofertas), Reportes (diarios/mensuales, ingresos, ranking, exportación CSV) y Configuración (datos comerciales, contacto, envíos, marcas, categorías).

## Inicio rápido (desarrollo)

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run dev
```

Sin variables de Supabase la tienda arranca en **modo vista previa**: muestra el catálogo de demostración
(`lib/catalog-data.ts`) y deshabilita cuentas, pedidos y pagos con un aviso visible. Para la tienda real sigue
[`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo, build y servidor de producción |
| `npm run typecheck` · `npm run lint` | Verificación de tipos y ESLint |
| `npm run db:seed:generate` | Regenera `supabase/seed.sql` desde `lib/catalog-data.ts` |
| `npm run test:db` | Aplica migraciones + seed en un PostgreSQL local y ejecuta 31 pruebas de seguridad y flujo de compra (requiere `PGHOST/PGPORT/PGUSER`) |
| `npm run test:smoke` | Prueba E2E con Playwright contra la app en ejecución (`BASE_URL`) |
| `npm run render:products` | Genera las fotos de producto (WEBP) a partir del modelo 3D (requiere `npm run dev` y Playwright) |

## Estructura

```
app/(store)/      tienda: portada, catálogo, producto, carrito, checkout, cuenta, legales
app/(auth)/       ingresar, registro, recuperar, actualizar-clave (+ server actions)
app/admin/        panel administrativo (+ actions.ts con todas las mutaciones)
app/api/          checkout, carrito, cupones, cotización, reintento de pago, webhook Mercado Pago
app/comprobante/  comprobante imprimible
components/three/ PhoneModel (smartphone procedural), visor, escena hero, carga GLB
lib/              datos, auth, supabase, pagos, formatos, carrito
supabase/         migraciones SQL, seed y pruebas
docs/             despliegue, seguridad y recursos visuales
```

## Documentación
- [Despliegue paso a paso (Supabase + Vercel + Mercado Pago)](docs/DESPLIEGUE.md)
- [Modelo de seguridad](docs/SEGURIDAD.md)
- [Recursos 3D e imágenes](docs/RECURSOS.md)
