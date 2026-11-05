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

## Publicar

Sigue [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md): 4 pasos (Vercel, Supabase desde Vercel, URL de autenticación y
Mercado Pago de prueba). La base de datos, el catálogo, los buckets y el primer administrador se configuran solos.

## Desarrollo local

```bash
npm install
```

```bash
npm run dev
```

Sin variables de Supabase la tienda arranca en **modo vista previa** (catálogo de demostración; cuentas, pedidos y
pagos desactivados con aviso). Variables: ver `.env.example`.

## Calidad y pruebas

| Comando | Qué verifica |
|---|---|
| `npm test` | Tipos, ESLint, firma del webhook, validaciones (precios, cupones, redirecciones) e integridad de las 138 imágenes |
| `npm run test:db` | 39 pruebas SQL: migraciones, RLS, flujo de compra, primer admin (requiere `PGHOST/PGPORT/PGUSER`) |
| `npm run test:payments` | 14 pruebas de integración de pagos contra PostgreSQL con la API de Mercado Pago simulada (`TEST_DATABASE_URL`) |
| `npm run test:smoke` / `npm run test:site` | E2E con Playwright y rastreo de rutas, imágenes, consola y móvil (`BASE_URL`) |
| `npm run db:setup` | Crea/actualiza la BD de forma no destructiva (`DATABASE_URL`) — se ejecuta solo en cada build |
| `npm run render:products` | Regenera las fotos de producto desde el modelo 3D |

GitHub Actions (`.github/workflows/ci.yml`) ejecuta todas las pruebas y el build en cada push.

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
