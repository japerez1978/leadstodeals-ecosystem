# Agent Worklog y Handoff

## Objetivo de este documento

Mantener un registro continuo de:

- que se hizo
- por que se hizo
- que queda pendiente
- como retomar el trabajo sin perder contexto

Este archivo se actualiza de forma incremental durante el proyecto.

## Reglas operativas acordadas con el usuario

- No hacer `git add`, `git commit` ni `git push` sin permiso explicito.
- Priorizar cambios seguros, reversibles y con impacto controlado.
- Si aparece un riesgo de romper produccion, pausar y validar antes de seguir.
- Nota puntual (2026-04-14 noche): el usuario pidio continuar en automatico y dio permiso operativo amplio.

## Estado actual de arquitectura

- Frontend: Netlify (`sats-saltoki`, `intranox-ofertas`, `leadstodeals-scoring`, `leadstodeals-admin`).
- Backend/proxy principal: Railway.
- Datos/autenticacion: Supabase.
- Monorepo raiz: `leadstodeals-ecosystem`.

## Registro cronologico

### 2026-04-14 - Bloque 1: estabilizacion deploys Netlify

Hecho:

- Se corrigieron builds monorepo para SAT, Ofertas, Scoring y Admin.
- Se resolvieron errores de dependencias nativas Linux en Netlify.
- Se alinearon versiones de `react` y `react-dom` para evitar runtime crash.

Por que:

- Habia fallos de build y pantalla en negro en produccion.
- El monorepo estaba parcialmente configurado para Netlify.

Resultado:

- Las 4 apps quedaron desplegables en Netlify.

### 2026-04-14 - Bloque 2: retirada de Vercel y limpieza estructural

Hecho:

- Se confirmo que Vercel ya no era necesario como pieza de runtime.
- Se consolidaron docs de onboarding y ruta de limpieza.

Por que:

- El objetivo es simplificar a Netlify + Railway + Supabase.

Resultado:

- Vercel se considera retirado a nivel operativo.

### 2026-04-14 - Bloque 3: integracion de `intranox-proxy` dentro del ecosystem

Hecho:

- Se creo carpeta oficial: `services/intranox-proxy`.
- Se copiaron `server.js`, `package.json` y documentacion del proxy legacy.
- Se añadieron scripts de raiz:
  - `dev:proxy`
  - `start:proxy`
- Se añadieron:
  - `docs/railway-intranox-proxy-migration.md`
  - `services/intranox-proxy/.env.example`
  - `services/intranox-proxy/ECOSYSTEM-NOTE.md`

Por que:

- El proxy era funcionalmente critico pero no estaba formalmente integrado.

Resultado:

- El proxy ya forma parte oficial del monorepo sin cambiar URL de produccion.
- La carpeta legacy sigue intacta para rollback seguro.

### 2026-04-14 - Bloque 4: baseline de billing desasistido + entitlements

Hecho:

- `leadstodeals-admin/server.js` ahora procesa webhooks Stripe con idempotencia:
  - deteccion de eventos ya procesados
  - registro de estado `received|processed|failed`
  - manejo de `checkout.session.completed`, `customer.subscription.updated` y `customer.subscription.deleted`
- Se normalizan slugs de apps para evitar inconsistencias (`ofertas`, `ofertas_hubspot`, `scoring`, `ltd_score`, etc.).
- Se robustecio `create-checkout` para validar `app_slug` y usar metadata normalizada.
- Se mejoro control de permisos en frontend:
  - `useUserAccess` filtra por usuario + tenant
  - interseccion con `tenant_apps.activa`
- Se corrigio bug en borrado de accesos de usuario en `UsersPage` (usa `auth_user_id + tenant_id` con fallback legacy).
- Se anadio migracion SQL:
  - `leadstodeals-admin/supabase/migrations/20260414_billing_entitlements_baseline.sql`
- Se documento contrato:
  - `docs/billing-entitlements-contract.md`

Por que:

- Necesidad de flujo desasistido, seguro y consistente para cobro + activacion de apps.
- Necesidad de evitar duplicados por reintentos de webhook y evitar accesos cruzados.

Resultado:

- Queda una base mucho mas solida para automatizar venta/activacion sin intervencion manual.
- Falta aplicar migracion en Supabase para cerrar contrato al 100%.

## Estado local actual (para el siguiente agente)

- Hay cambios locales pendientes (consultar `git status` antes de tocar nada).
- Servidor local de proxy se puede levantar en puerto alternativo si 3000 esta ocupado:
  - `PORT=3001 npm run dev:proxy`
- `GET /health` responde correctamente en local.

### 2026-04-15 - Bloque 10: corrección entitlement manual + gestión de apps por tenant

Hecho:

- Corregido bug crítico en `BillingPage.jsx`:
  - `handleManualSubscription` ya hace upsert en `tenant_apps` tras crear la suscripción.
  - Antes: activar un plan manual creaba la fila en `subscriptions` pero NO activaba `tenant_apps`, bloqueando el acceso real de usuarios.
  - Ahora: el path manual tiene el mismo efecto que el path Stripe.
- Añadida gestión directa de apps por tenant en `TenantsPage.jsx`:
  - Nuevo botón por fila (icono `AppWindow`) abre modal de apps del tenant.
  - El modal lista todos los productos del catálogo con estado activo/inactivo.
  - Toggle llama a upsert/update en `tenant_apps` directamente (operación de soporte sin pasar por Stripe).
  - Útil para activaciones manuales, pruebas, y correcciones de emergencia.
- Build verificado: ✅

Por qué:

- El bug de entitlement manual bloqueaba el acceso aunque el admin viera la suscripción como activa.
- Faltaba un punto de control operativo para gestionar apps por tenant sin tocar Stripe ni la BD directamente.

Resultado:

- Flujo manual y flujo Stripe ahora tienen el mismo contrato de activación.
- Operaciones de soporte de primer nivel posibles desde la UI sin acceso a Supabase Studio.

### 2026-04-15 - Bloque 11: migración baseline aplicada en Supabase + fix de esquema

Hecho:

- Aplicada migración `billing_entitlements_baseline` en proyecto `leadstodeals-multitenant` (eu-central-1).
- Detectado desajuste de esquema: `user_app_access` tenía `tenant_user_id` (uuid interno) pero el frontend y la función esperaban `auth_user_id` (uuid de Supabase Auth).
- Resuelto en la misma migración:
  - Añadida columna `auth_user_id uuid` a `user_app_access`.
  - Backfill automático desde `tenant_users` para registros existentes.
  - Índice sobre `auth_user_id` para queries eficientes.
- Creadas en producción:
  - Tabla `billing_events` con índices por `status` y `received_at`.
  - Columnas `stripe_subscription_id`, `stripe_price_id`, `current_period_end` en `subscriptions`.
  - Unique index `subscriptions_stripe_subscription_id_uq`.
  - Unique index `tenant_apps_tenant_id_app_slug_uq` (necesario para upserts idempotentes).
  - Función `has_effective_app_access(auth_user_id, tenant_id, app_slug)`.

Por qué:

- Sin `billing_events` los webhooks de Stripe no tenían idempotencia real.
- Sin el fix de `auth_user_id` el toggle de acceso en `UsersPage` insertaba en columna inexistente.
- Sin el unique index en `tenant_apps` el upsert del webhook podía fallar en carrera.

Resultado:

- Contrato técnico de billing/entitlements cerrado al 100% en producción.
- El webhook de Stripe ya puede registrar y verificar idempotencia real.
- Los accesos de usuarios se guardan y consultan correctamente.

### 2026-04-15 - Bloque 12: E2E de BD + normalización de slugs en producción

Hecho:

- Validación E2E completa a nivel de BD:
  - `billing_events` ✅ — escritura e idempotencia (ON CONFLICT DO NOTHING) verificadas.
  - `tenant_apps` upsert ✅ — unique index funciona, no duplica.
  - `has_effective_app_access` ✅ — retorna `true` cuando tenant activo + usuario con acceso.
  - Desactivación de tenant corta acceso ✅ — `false` inmediato al poner `activa=false`.
- Detectado desajuste de slugs entre `apps` tabla y `tenant_apps`/`user_app_access`:
  - Slugs del catálogo actualizados de `hs-offers`, `sat-mgmt`, `ltd-score` → canónicos (`ofertas_hubspot`, `sat_gestion`, `ltd_score`).
  - `tenant_apps` y `user_app_access` normalizados con los mismos slugs canónicos.
- Detectado que el billing backend (`server.js`) NO está desplegado en Railway.
  - Railway actual = solo proxy HubSpot (`/ofertas`, `/properties`, etc.).
  - Webhook de Stripe apunta a Railway pero no existe el endpoint `/api/stripe-webhook` ahí.

Por qué:

- Sin slugs canónicos consistentes, el checkout Stripe habría fallado con "app_slug no configurado".
- La función `has_effective_app_access` ya es usable desde las apps cliente para validar acceso.

Resultado:

- BD completamente alineada y validada.
- Slugs canónicos consistentes en `apps`, `tenant_apps` y `user_app_access`.

## Bloqueante para E2E completo (Stripe → webhook → BD)

El billing backend (`leadstodeals-admin/server.js`) necesita desplegarse en Railway como servicio separado. Hasta entonces, el flujo Stripe real no puede cerrar el ciclo. Opciones:

1. **Nuevo servicio Railway** (`leadstodeals-admin`) con el `server.js` actual.
2. Actualizar `API_BASE` en `BillingPage.jsx` a la nueva URL de Railway una vez desplegado.
3. Actualizar el webhook en Stripe al nuevo endpoint.

Pendiente de confirmación del usuario antes de crear el nuevo servicio Railway.

## Pendientes inmediatos (prioridad)

1. Migrar en Railway el Root Directory al path `services/intranox-proxy`.
2. Validar en produccion:
   - `/health`
   - `/ofertas`
   - `/ofertas/search`
3. Si todo esta estable, archivar carpeta legacy `calculadora presupuestos intranox`.
4. Aplicar migracion `20260414_billing_entitlements_baseline.sql` en Supabase.

## Pendientes estrategicos (siguiente fase)

1. Rediseno de `leadstodeals-admin` para asignacion de apps por empresa y usuario.
2. Modelo canónico SaaS:
   - `tenants`, `apps`, `tenant_apps`, `tenant_users`, `user_app_access`, `subscriptions`.
3. Flujo Stripe -> webhook -> activacion real de apps.
4. Auditoria multitenant y RLS.

## Comandos utiles

```bash
# Estado rapido
git status --short

# Levantar proxy local (puerto por defecto)
npm run dev:proxy

# Levantar proxy local en puerto alternativo
PORT=3001 npm run dev:proxy

# Check rapido del proxy
curl -s http://localhost:3001/health
```

## Nota de continuidad

Antes de cualquier cambio nuevo:

1. Leer este archivo.
2. Revisar `docs/railway-intranox-proxy-migration.md`.
3. Confirmar si hay permiso explicito para commit/push.

---

### 2026-04-14 - Bloque 5: validacion integral + limpieza final de Vercel

Hecho:

- Validacion de builds post-cambios:
  - `npm run build:admin` ✅
  - `npm run build:scoring` ✅
  - `npm run build:ofertas` ✅
- Limpieza de artefactos Vercel en repo:
  - eliminado `intranox-ofertas/vercel.json`
  - eliminado `leadstodeals-scoring/vercel.json`
  - eliminado `leadstodeals-admin/vercel.json`
  - eliminada carpeta `leadstodeals-admin/.vercel`
- Actualizado onboarding para reflejar que Vercel ya no forma parte operativa del código.
- Creado plan basal detallado:
  - `leadstodeals-admin/docs/foundation-plan.md`

Por que:

- Evitar doble configuración histórica y reducir ruido de infraestructura.
- Alinear la base para escalar con contrato SaaS estable y repetible.
- Garantizar que el próximo agente tenga mapa operativo claro sin depender de contexto oral.

Resultado:

- Código y documentación ya apuntan a arquitectura objetivo: Netlify + Railway + Supabase.
- Existe blueprint explícito de cimientos (billing, entitlements, RLS, observabilidad, runbooks).

Pendiente inmediato:

1. Aplicar en Supabase la migración `leadstodeals-admin/supabase/migrations/20260414_billing_entitlements_baseline.sql`.
2. Ejecutar test real E2E:
   - checkout Stripe de prueba
   - webhook procesado
   - `tenant_apps.activa=true`
   - acceso concedido a usuario y validado en app.
3. Opcional corto plazo: dividir bundles pesados en `ofertas` y `scoring` (aviso de chunks > 500 kB).

Estado operativo local (turno actual):

- Frontend admin levantado en `http://localhost:5175/`.
- Backend central levantado en `http://localhost:3001/`.
- Health check backend: `{"ok":true,"objectId":"2-198173351","tokenConfigured":false}`.

### 2026-04-14 - Bloque 6: hardening de cliente Supabase en Admin

Hecho:

- Detectado warning recurrente en consola:
  - `Multiple GoTrueClient instances detected in the same browser context`.
- Unificado `leadstodeals-admin` para usar una sola instancia de Supabase (`core-saas`).
- Archivos ajustados:
  - `leadstodeals-admin/src/App.jsx`
  - `leadstodeals-admin/src/pages/DashboardPage.jsx`
  - `leadstodeals-admin/src/pages/BillingPage.jsx`
- Eliminado cliente duplicado:
  - `leadstodeals-admin/src/supabase.js`
- Revalidado build:
  - `npm run build:admin` ✅

Por que:

- Evitar comportamiento indefinido en autenticación/sesión por doble cliente GoTrue.
- Mantener contrato técnico homogéneo entre apps del ecosistema.

Resultado:

- `admin` ya consume una única fuente de cliente Supabase.
- Menor riesgo de inconsistencias de sesión y eventos de auth duplicados.

### 2026-04-15 - Bloque 7: arranque SAT portable local-first

Hecho:

- Se crea proyecto nuevo `sats-saltoki-portable` como variante paralela de la SAT cloud.
- Se documenta arquitectura en `docs/sat-portable-architecture.md`.
- Se decide mantenerlo fuera del monorepo activo como workspace por ahora:
  - convive en el repo
  - no participa aun en `package.json` raiz
- Se levanta shell portable con `Electron + React + Vite`.
- Se activa importacion de Excel reutilizando la logica base de la SAT online.
- Se activa persistencia local inmediata en navegador con `localStorage` para sobrevivir a apagados del equipo mientras se prepara el salto a SQLite.
- Se valida build web de `sats-saltoki-portable` correctamente.

Por que:

- El usuario necesita una alternativa sin internet y sin tocar la SAT en produccion.
- Separarlo reduce riesgo y permite iterar rapido sobre restricciones reales del equipo corporativo.

Resultado:

- Ya existe una version portable inicial accesible en local.
- Ya se pueden cargar Exceles y dejar datos persistidos en el equipo.
- Siguiente paso tecnico: reemplazar persistencia temporal del navegador por `SQLite` + fotos locales a traves de Electron.

Actualizacion del bloque:

- Se anade CRUD real local sobre la SAT portable.
- Ya se puede:
  - importar Excel
  - crear SAT nuevo
  - editar SAT existente
  - eliminar SAT
  - exportar otra vez a Excel
- La persistencia sigue siendo local en navegador como paso intermedio controlado.
- Build verificado de `sats-saltoki-portable` despues del CRUD: OK.

### 2026-04-15 - Bloque 8: migrador base Supabase -> SAT portable

Hecho:

- Se crea script `sats-saltoki-portable/scripts/import-from-supabase.mjs`.
- El script:
  - lee registros `sats` desde Supabase
  - descarga fotos desde las URLs guardadas en `fotos`
  - guarda las imagenes en `sats-saltoki-portable/data/photos/<sat-id>/`
  - genera `sats-saltoki-portable/data/portable-import.json`
- Se anade script npm:
  - `npm run import:supabase`

Por que:

- El usuario quiere conservar el historico visual y no rehacer manualmente la carga de fotos.
- La relacion SAT -> fotos ya existe en Supabase y es mejor aprovecharla automaticamente.

Resultado:

- Ya existe una base de migracion automatizable desde la SAT cloud hacia la SAT portable.
- Falta el ultimo paso de integrar ese JSON exportado directamente en la UI del portable.

### 2026-04-15 - Bloque 8: robustez de persistencia y UX portable

Hecho:

- La SAT portable ya no pisa trabajo local al arrancar: solo carga el historico automatico si no existen datos locales guardados.
- Se mejora la paginacion para trabajar por bloques mas limpios y escalables.
- Se corrige la presentacion de fotos migradas: en navegador local las fotos importadas desde rutas `file://` muestran placeholder limpio hasta usar Electron.
- Se pulen detalles visuales del panel operativo y de los contadores.

Por que:

- El comportamiento anterior podia sobrescribir cambios locales al reabrir la app.
- La paginacion inicial no era comoda ni estetica cuando habia muchas paginas.
- Las fotos migradas desde Supabase deben integrarse sin dar sensacion de error visual en modo navegador.

Resultado:

- La portable ya se comporta como base real de trabajo local, con menor riesgo de perdida de cambios y mejor lectura operativa.

### 2026-04-15 - Bloque 9: fotos portables + carpeta de entrega Windows

Hecho:

- Se normalizan las fotos historicas a rutas portables `photos/...` en vez de `file://` absolutas.
- La UI ya resuelve esas fotos en modo Electron sin quedar atada al Mac origen.
- Se anaden scripts de soporte:
  - `npm run normalize:import`
  - `npm run prepare:handoff`
- Se genera carpeta de entrega en `sats-saltoki-portable/handoff/SAT-Saltoki-Portable`.
- Se crea manual corto de instalacion y uso:
  - `sats-saltoki-portable/MANUAL-INSTALACION-Y-USO.md`
- Se intentó generar `.exe` Windows portable desde este Mac, pero fallo por incompatibilidad de `wine64` en Apple Silicon.
- Se deja configurado `electron-builder` para futuro target Windows `x64 portable`.

Por que:

- Las rutas absolutas rompian el traslado del proyecto a otro equipo.
- Hacia falta una entrega clara para mover la app a un PC Windows con el menor riesgo posible.
- El objetivo es dejar preparado el ultimo salto a ejecutable cuando se disponga de un Windows autorizado.

Resultado:

- Fotos y datos ya viajan en formato portable.
- Existe una carpeta de handoff lista para copiar al nuevo PC.
- El ultimo bloqueo real para el `.exe` es el empaquetado final desde entorno Windows, no la logica de la app.

### 2026-04-16 - Bloque 10: correcciones admin billing + modal apps por tenant

Hecho:

- Bug corregido en `BillingPage.jsx`: activación manual de suscripción ya no crea solo la fila en `subscriptions` — ahora también hace upsert en `tenant_apps` con `activa: true`, igual que el webhook de Stripe.
- Nueva funcionalidad en `TenantsPage.jsx`: botón de icono en cada fila de empresa que abre modal con todos los productos del catálogo. Permite activar/desactivar cada app directamente en `tenant_apps` sin pasar por Stripe (útil para soporte, pruebas, migraciones).

Por que:

- El path manual de activación dejaba la empresa sin acceso real aunque tuviera suscripción activa.
- El admin necesitaba una forma directa de gestionar entitlements por empresa.

Resultado:

- Activación manual funciona de extremo a extremo.
- Admin puede gestionar apps por empresa desde la UI sin tocar la BD.

### 2026-04-16 - Bloque 11: migración baseline Supabase + fix esquema + E2E BD

Hecho:

- Aplicada migración `20260414_billing_entitlements_baseline.sql` en producción (proyecto `leadstodeals-multitenant`, región `eu-central-1`).
  - Tabla `billing_events` creada (idempotencia de webhooks Stripe).
  - Función `has_effective_app_access()` creada.
  - Unique indexes en `tenant_apps` y `subscriptions`.
  - Columnas `stripe_subscription_id`, `stripe_price_id`, `current_period_end` añadidas a `subscriptions`.
- Fix de esquema detectado y aplicado: `user_app_access` tenía `tenant_user_id` pero el frontend usaba `auth_user_id`. Se añadió columna y se hizo backfill automático desde `tenant_users`.
- Slugs del catálogo (`apps` table) normalizados a slugs canónicos: `ofertas_hubspot`, `sat_gestion`, `ltd_score`.
- Validación E2E completa en BD:
  - `billing_events`: escritura + idempotencia ✅
  - `tenant_apps`: upsert sin duplicados ✅
  - `has_effective_app_access`: retorna `true` con acceso ✅
  - Desactivar tenant corta acceso instantáneamente (`false`) ✅

Por que:

- Sin la migración los webhooks no tenían idempotencia real.
- El desajuste `tenant_user_id`/`auth_user_id` habría roto el check de acceso en apps cliente.
- Los slugs inconsistentes habrían causado `app_slug no configurado` en el servidor.

Resultado:

- Capa de BD de billing 100% operativa en producción.

### 2026-04-16 - Bloque 12: deploy billing backend en Railway

Hecho:

- Preparado `leadstodeals-admin` para Railway:
  - `package.json`: scripts `start` y `build:server` añadidos.
  - `railway.toml`: creado con `startCommand = "node server.js"` y healthcheck en `/health`.
  - `.env.example` del servidor creado.
  - `API_BASE` en `BillingPage.jsx` ahora configurable vía `VITE_BACKEND_URL`.
  - `server.js`: endpoint `/health` añadido, `PORT` respeta variable de entorno Railway.
- Resueltos problemas de deploy:
  - `core-saas` movido a `devDependencies` (no es necesario en servidor).
  - `react` fijado en `19.2.4` para alinear `package.json` y `package-lock.json` (npm ci).
  - `railway.toml` sin `builder` explícito para que Railway auto-detecte.
- Servicio desplegado y activo en: `https://leadstodeals-ecosystem-production.up.railway.app`
  - Health check: `{"status":"ok"}` ✅
- Webhook de Stripe actualizado a la nueva URL Railway:
  - `https://leadstodeals-ecosystem-production.up.railway.app/api/stripe-webhook`
- Variables de entorno configuradas en Railway:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STRIPE_SK`, `STRIPE_PRICE_OFERTAS`, `STRIPE_PRICE_SAT`, `STRIPE_WEBHOOK_SECRET`
- `BillingPage.jsx` actualizado con la URL de producción Railway.

Por que:

- El único bloqueante para E2E Stripe completo era que el servidor solo corría en local.
- Sin el webhook en producción los pagos no activaban apps automáticamente.

Resultado:

- Billing backend en producción. El ciclo Stripe → webhook → `billing_events` → `tenant_apps.activa=true` ya puede cerrarse en producción.

Consolidación de Railway realizada:

- Borrados 3 proyectos legacy (intranox-proxy separado, leadstodeals-admin separado, duplicados).
- Nuevo servicio proxy creado en el mismo proyecto `reliable-love`:
  - URL: `https://honest-clarity-production-e77d.up.railway.app`
  - Root Directory: `services/intranox-proxy`
  - Health: `{"ok":true,"objectId":"2-198173351","tokenConfigured":true}` ✅
- Ofertas actualizada a nueva URL proxy.

### 2026-04-16 - Bloque 13: control de vencimientos de acceso

Hecho:

- Creada migración `20260416_add_tenant_apps_expiry.sql`:
  - Columna `fecha_vencimiento` en `tenant_apps` (para activaciones manuales).
  - Columna `motivo_desactivacion` en `tenant_apps` (para registro de por qué se desactivó).
  - Actualizada función `has_effective_app_access()` para validar que no haya expirado.
- Con esto:
  - Clientes vía Stripe → se controlan automáticamente vía webhooks.
  - Clientes manuales → se cortan automáticamente cuando vence `fecha_vencimiento`.

Por que:

- El usuario necesita dos flujos simultáneos: algunos clientes pagan vía Stripe, otros tienen activación manual con vencimiento fijo.
- Sin control de fecha, los clientes manuales tenían acceso indefinido.

Resultado:

- Sistema listo para manejar ambos flujos de forma automática.

Pendiente para mañana:

1. Aplicar migración `20260416_add_tenant_apps_expiry.sql` en Supabase producción.
2. Actualizar UI del admin: cuando activas una app manualmente, permitir seleccionar fecha de vencimiento.
3. Test E2E real: checkout Stripe de prueba → pago → webhook procesado → `billing_events` registrado → `tenant_apps.activa=true`.
4. Configurar `VITE_BACKEND_URL` en Netlify para el deploy de `leadstodeals-admin`.
