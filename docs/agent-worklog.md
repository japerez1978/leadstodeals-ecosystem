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
