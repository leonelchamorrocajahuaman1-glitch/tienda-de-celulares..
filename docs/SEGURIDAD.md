# Modelo de seguridad de NEXPHONE

## Principios
1. **La base de datos es la autoridad.** Toda tabla tiene Row Level Security. Aunque alguien use la clave pública `anon` directamente contra la API de Supabase, solo puede hacer lo que permiten las políticas.
2. **El navegador nunca define precios, totales, stock ni roles.** El checkout envía solo `variant_id` + cantidad; `create_order()` (SECURITY DEFINER) lee precios, aplica cupón y envío desde la BD y verifica stock.
3. **El rol administrador vive en `profiles.role`.** El registro ignora cualquier rol enviado en metadatos; un trigger impide que un usuario se otorgue privilegios. Solo un administrador (o el propietario por SQL) puede cambiar roles.
4. **Los pagos solo se confirman con la pasarela.** Webhook con firma HMAC + consulta directa a la API de Mercado Pago. Los parámetros de retorno (`?status=approved`) no se consideran prueba.
5. **Secretos solo en servidor.** `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` se usan en módulos `server-only`.

## Matriz de acceso (resumen)

| Recurso | Anónimo | Cliente | Admin |
|---|---|---|---|
| Productos, variantes, imágenes, stock activos | leer | leer | todo |
| Costos (`variant_costs`) | — | — | todo |
| Perfil | — | leer/editar el propio (sin rol ni estado) | todo |
| Direcciones, carrito | — | solo los propios | leer |
| Pedidos, ítems, historial, pagos | — | **leer** los propios; crear vía `create_order()`; cancelar pendientes vía `cancel_my_order()` | leer/actualizar vía funciones |
| Notas internas de pedidos | — | — | todo |
| Cupones | validar vía `validate_coupon()` | ídem | todo |
| Inventario | leer | leer | ajustar vía `admin_adjust_inventory()` (con historial) |
| `confirm_order_payment()` | — | — | admin (pagos manuales) / `service_role` (webhook) |
| Storage (imágenes/modelos) | leer | leer | subir/borrar |

## Capas adicionales
- **Middleware** refresca la sesión y redirige rutas protegidas (`/cuenta`, `/checkout`, `/admin`, `/comprobante`).
- **`requireAdmin()`** en cada página y server action del panel (verificación en servidor con `auth.getUser()` + `profiles.role`). Usuarios no admin reciben 404 en `/admin`.
- **Validación con zod** en todas las rutas API y server actions; mensajes de error de BD internos no se exponen.
- **Archivos**: verificación de firma binaria (magic bytes) para JPG/PNG/WEBP/GLB, límites de tamaño, nombres seguros, validación de que el conjunto GLTF contenga todos los archivos referenciados; los buckets imponen tipo MIME y tamaño en el servidor y las URLs guardadas deben pertenecer al Storage del proyecto.
- **Concurrencia**: el descuento de stock bloquea filas (`FOR UPDATE`); la confirmación es idempotente.
- **Cabeceras**: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Redirecciones**: `safeNext()` evita redirecciones abiertas tras el login.
- **CSV**: escape de fórmulas para evitar inyección en Excel.

## Pruebas automatizadas
`npm run test:db` ejecuta 31 comprobaciones sobre las migraciones reales, entre ellas: registro con rol forzado, escalamiento de privilegios, manipulación de precios/stock, inserción directa de pedidos, precio enviado por el cliente ignorado, cupón con tope, compra sin stock, cliente intentando confirmar su propio pago, aislamiento entre clientes, idempotencia del pago, pago incompleto → revisión, notas internas invisibles, reposición al cancelar y acceso anónimo.
