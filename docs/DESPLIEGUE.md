# Despliegue de NEXPHONE

Orden recomendado: **Supabase → variables → Vercel → Mercado Pago → primer administrador → pruebas**.

## 1. Supabase

1. Crea un proyecto en <https://supabase.com> (región recomendada: `sa-east-1` São Paulo, la más cercana a Perú).
2. Ejecuta las migraciones **en orden** en *SQL Editor* (o con la CLI: `supabase link` y `supabase db push`):
   1. `supabase/migrations/20261104000001_schema.sql`
   2. `supabase/migrations/20261104000002_security.sql`
   3. `supabase/migrations/20261104000003_commerce_functions.sql`
   4. `supabase/migrations/20261104000004_storage.sql` (crea los buckets `product-images` y `product-models` con límites de tamaño y tipos MIME)
   5. `supabase/migrations/20261104000005_admin_costs.sql`
3. Carga el catálogo inicial: ejecuta `supabase/seed.sql` (20 productos, 9 marcas, stock inicial y 2 cupones de ejemplo: `NEXWELCOME`, `FUTURE100`). Es opcional y puedes editar todo desde `/admin`.
4. **Authentication → URL Configuration**
   - *Site URL*: `https://tu-dominio.pe`
   - *Redirect URLs*: `https://tu-dominio.pe/auth/callback`, `https://tu-dominio.pe/auth/confirm` y, para desarrollo, `http://localhost:3000/auth/callback`.
5. **Authentication → Providers → Email**: deja activada la confirmación de correo. Para producción configura un SMTP propio (*Authentication → SMTP*); el SMTP integrado de Supabase tiene un límite bajo de envíos.
6. (Opcional) Plantillas de correo en español en *Authentication → Email Templates*. Si usas el formato con `token_hash`, apunta a `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery` (o `type=signup`).

### Storage
Los buckets quedan creados por la migración 4 como **públicos para lectura** y **escritura solo para administradores** (políticas RLS en `storage.objects` con `is_admin()`). Límites: imágenes 5 MB (JPG/PNG/WEBP), modelos 30 MB (GLB/GLTF + .bin + texturas).

## 2. Variables de entorno

Copia `.env.example`. En Vercel: *Project → Settings → Environment Variables*.

| Variable | Dónde se obtiene | Pública |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | tu dominio | sí |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | sí (protegidas por RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **NO** — solo servidor |
| `MP_ACCESS_TOKEN` | Mercado Pago → Tus integraciones → Credenciales | **NO** |
| `MP_WEBHOOK_SECRET` | Mercado Pago → Webhooks → Clave secreta | **NO** |
| `SUNAT_EINVOICING_ENABLED` | `1` solo con facturación electrónica integrada | — |

## 3. Vercel

1. Importa el repositorio en <https://vercel.com/new> (framework detectado: Next.js; no requiere configuración extra).
2. Agrega las variables del paso 2 para *Production* y *Preview*.
3. Despliega y conecta tu dominio (*Settings → Domains*). Actualiza `NEXT_PUBLIC_SITE_URL` y las URLs de Supabase Auth con el dominio final.

## 4. Mercado Pago (Perú)

1. Crea una aplicación en <https://www.mercadopago.com.pe/developers/panel> (producto: *Checkout Pro*).
2. Usa primero las **credenciales de prueba** (`TEST-...`) y crea usuarios de prueba (vendedor/comprador). En modo pruebas el checkout muestra un aviso y no se cobra dinero real.
3. **Webhooks**: URL `https://tu-dominio.pe/api/webhooks/mercadopago`, evento **Pagos**. Copia la *clave secreta* en `MP_WEBHOOK_SECRET`.
4. Cómo se confirma un pago (no se confía en el navegador):
   - El webhook valida la firma HMAC `x-signature` (con ventana anti-replay de 10 min).
   - Consulta el pago en la API de Mercado Pago (`GET /v1/payments/{id}`) con el token secreto.
   - Si está `approved`, en moneda PEN y con `external_reference` = id del pedido, llama a `confirm_order_payment()`, que bloquea filas, valida monto y stock, descuenta inventario, registra la transacción, genera el número de comprobante y marca el pedido como pagado. Es idempotente.
   - Si el monto no coincide o falta stock, el pedido queda en **Requiere revisión** sin descontar inventario.
5. Para pasar a producción reemplaza las credenciales por las productivas (sin prefijo `TEST-`).

**Transferencia / pago en tienda**: el pedido queda *Pendiente de pago*; el administrador confirma desde `/admin/pedidos/{id}` ingresando el n.° de operación tras verificarlo en su banco o caja.

> Culqi: la arquitectura está preparada (tabla `payments` con `provider`, funciones `confirm_order_payment`/`record_payment_event` genéricas). Para agregarlo se necesita un módulo `lib/payments/culqi.ts` (cargo con token de Culqi.js + verificación) y su webhook; no se incluye porque requiere credenciales del comercio para probarlo.

## 5. Primer administrador

Por seguridad ningún usuario puede volverse administrador desde la web. Regístrate en la tienda y luego, en *SQL Editor* de Supabase:

```sql
update public.profiles set role = 'admin' where email = 'tu-correo@dominio.pe';
```

Después, desde `/admin/clientes` puedes otorgar o quitar el rol a otros usuarios.

## 6. Verificación

```bash
BASE_URL=https://tu-dominio.pe npm run test:smoke
```

Checklist manual: registro + correo de confirmación, recuperación de contraseña, compra con tarjeta de prueba, llegada del webhook (pedido pasa a *Pagado* y aparece el comprobante), stock descontado en `/admin/inventario`, exportación CSV en `/admin/reportes`.

## 7. Antes de operar públicamente
- Datos reales en `/admin/configuracion` (razón social, RUC, dirección, cuentas bancarias).
- **Facturación electrónica SUNAT**: el comprobante incluido es un documento de compra con IGV desglosado; para emitir boletas/facturas electrónicas válidas integra un OSE/PSE (p. ej. Nubefact, Efact) y activa `SUNAT_EINVOICING_ENABLED=1`.
- **Libro de Reclamaciones virtual** (INDECOPI) y revisión legal de los textos en `app/(store)/legal/[slug]/page.tsx`.
- Fotos oficiales de producto: ver [`RECURSOS.md`](RECURSOS.md).
