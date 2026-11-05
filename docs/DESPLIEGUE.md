# Publicar NEXPHONE en internet

El proyecto ya está preparado para que la configuración sea casi automática:

| Lo hace el proyecto solo | Cómo |
|---|---|
| Crear tablas, relaciones, índices, funciones, RLS, roles y buckets de Storage | `npm run build` ejecuta `scripts/db-setup.mjs` en cada despliegue si hay conexión a la BD. Las migraciones son idempotentes y **nunca borran datos**; el catálogo inicial (20 celulares) se carga **solo si la tabla de productos está vacía**. |
| Primer administrador | La cuenta cuyo correo coincide con `ADMIN_EMAIL` pasa a ser admin al confirmar su correo e iniciar sesión (solo mientras no exista ningún admin). |
| URL pública | Se toma automáticamente del dominio de producción de Vercel. |
| Verificación | `/api/health` y **/admin/configuracion → Estado del sistema** comprueban en vivo Supabase, esquema, RLS, Storage, catálogo, administradores y la credencial de Mercado Pago. |

Lo único que no se puede automatizar sin tu cuenta son las autorizaciones. Son 4 pasos, ~10 minutos.

---

## Paso 1 — Crear el proyecto en Vercel (importar el repositorio)

1. Entra a <https://vercel.com/new> e inicia sesión con GitHub.
2. Busca el repositorio **`tienda-de-celulares..`** → **Import**. (Si no aparece: *Adjust GitHub App Permissions* y dale acceso a ese repositorio.)
3. En **Environment Variables** agrega solo una por ahora:
   - `ADMIN_EMAIL` = el correo con el que vas a administrar la tienda.
4. **Deploy**. El primer despliegue sale en "modo vista previa" (aún sin base de datos); es normal.

## Paso 2 — Conectar Supabase desde Vercel (crea la BD y las variables por ti)

1. En tu proyecto de Vercel: pestaña **Storage** → **Create Database** → **Supabase** → acepta la integración.
2. Región: **São Paulo (sa-east-1)**, la más cercana a Perú. Elige un nombre y crea.
3. Pulsa **Connect Project** y selecciona el proyecto NEXPHONE para *Production* y *Preview*.
   La integración agrega automáticamente las variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` y `POSTGRES_URL_NON_POOLING`, entre otras.
4. Ve a **Deployments** → menú **⋯** del último → **Redeploy**.
   En el registro del build verás `[db-setup] Base de datos lista ✔` con 19 tablas, 14 funciones y 2 buckets.

> ¿Ya tienes un proyecto Supabase propio? En lugar del paso 2, copia en Vercel esas cuatro variables desde *Supabase → Project Settings → API* y *Database → Connection string (Session pooler)*.

## Paso 3 — Autenticación de Supabase (2 campos)

En <https://supabase.com/dashboard> → tu proyecto → **Authentication → URL Configuration**:
- **Site URL**: `https://TU-PROYECTO.vercel.app` (el dominio que muestra Vercel).
- **Redirect URLs** → *Add URL*: `https://TU-PROYECTO.vercel.app/**`

Luego, en la tienda publicada: **Crear cuenta** con el correo de `ADMIN_EMAIL` → confirma el correo → inicia sesión → entrarás directamente a **/admin**.

> El SMTP incluido en Supabase solo envía unos pocos correos por hora (suficiente para empezar). Para operar con clientes reales configura un SMTP propio en *Authentication → Emails → SMTP Settings*.

## Paso 4 — Mercado Pago en modo de pruebas

1. <https://www.mercadopago.com.pe/developers/panel/app> → **Crear aplicación** → producto *Pagos online / Checkout Pro*.
2. En la aplicación → **Credenciales de prueba** → copia el **Access Token** (empieza con `TEST-`).
3. **Webhooks → Configurar notificaciones** → modo *Pruebas* →
   URL: `https://TU-PROYECTO.vercel.app/api/webhooks/mercadopago` → evento **Pagos** → Guardar → copia la **clave secreta**.
4. En Vercel → *Settings → Environment Variables*: `MP_ACCESS_TOKEN` (Access Token de prueba) y `MP_WEBHOOK_SECRET` (clave secreta) → **Redeploy**.
5. En **/admin/configuracion → Estado del sistema** debe aparecer *Mercado Pago (pruebas): Credencial válida* (se comprueba consultando la API de Mercado Pago).
6. Prueba una compra con una **tarjeta de prueba** de Mercado Pago (<https://www.mercadopago.com.pe/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards>), con un **usuario comprador de prueba**. No se cobra dinero real. Tras aprobarse: el pedido pasa a *Pagado*, se descuenta el stock y aparece el comprobante.

Para cobrar de verdad, más adelante reemplaza ambas variables por las credenciales **de producción** y vuelve a configurar el webhook en modo *Productivo*.

---

## Cómo se protege cada cosa
- Clientes: solo ven y gestionan su perfil, direcciones, carrito, pedidos y comprobantes (RLS en la BD).
- Administradores: gestionan productos, precios, inventario, pedidos, pagos, clientes, promociones, reportes y configuración. El rol se guarda en la BD y se verifica en el servidor; nadie puede otorgárselo desde el navegador.
- Más detalle: [`SEGURIDAD.md`](SEGURIDAD.md).

## Comandos útiles (opcionales, para desarrolladores)

```bash
npm test
```

```bash
DATABASE_URL="postgres://..." npm run db:setup
```

## Antes de operar públicamente
- Completa **/admin/configuracion** (razón social, RUC, dirección, cuentas bancarias, contacto).
- **Facturación electrónica SUNAT**: el comprobante incluido desglosa el IGV, pero para boletas/facturas electrónicas válidas se debe integrar un OSE/PSE (p. ej. Nubefact) y activar `SUNAT_EINVOICING_ENABLED=1`.
- **Libro de Reclamaciones virtual** (INDECOPI) y revisión legal de los textos en `app/(store)/legal/[slug]/page.tsx`.
- Dominio propio: *Vercel → Settings → Domains*; después actualiza el Site URL de Supabase y la URL del webhook de Mercado Pago.
