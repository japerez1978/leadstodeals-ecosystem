# Foundation Plan: Base SaaS para Escalar a Miles de Clientes

## Objetivo

Definir los cimientos técnicos y operativos obligatorios antes de construir una app más.

Meta: un ecosistema desasistido (venta, cobro, activación, control de acceso, soporte operativo) con seguridad y estabilidad de nivel producción.

## Alcance

- Monorepo, contratos entre apps y servicios, pipeline de despliegue.
- Modelo multitenant canónico en Supabase.
- Billing y provisioning con Stripe.
- Gobierno de permisos por empresa y por usuario.
- Observabilidad, seguridad, continuidad y runbooks.

## Principios No Negociables

1. Una sola fuente de verdad por dominio.
2. Cualquier operación crítica debe ser idempotente.
3. Ninguna app debe conceder acceso sin validar contrato activo.
4. Todo cambio sensible deja trazabilidad auditable.
5. No se aceptan “atajos frontend” para reglas de negocio críticas.

## Arquitectura Objetivo

### Runtime

- Frontend apps: Netlify.
- Backend API + webhooks + jobs: Railway.
- Datos/Auth/RLS: Supabase.

### Dominios

- `billing`: checkout, customer portal, webhooks Stripe.
- `entitlements`: estado de contrato por tenant/app.
- `access`: permisos por usuario dentro de tenant.
- `catalog`: definición única de apps y planes.
- `audit`: eventos operativos y seguridad.

### Contrato entre dominios

`Stripe event -> subscriptions -> tenant_apps -> user_app_access -> acceso efectivo`.

## Modelo de Datos Canónico

## Tablas núcleo

- `tenants`
- `apps`
- `tenant_users`
- `subscriptions`
- `tenant_apps`
- `user_app_access`
- `billing_events`
- `audit_logs`

## Reglas de negocio

1. `tenant_apps` representa contratación/activación de la app por empresa.
2. `user_app_access` representa permiso individual de usuario.
3. Acceso efectivo:
   - tenant tiene app activa
   - usuario tiene permiso sobre esa app
4. `subscriptions` nunca se edita manualmente desde UI sin pasar por backend.
5. `billing_events` bloquea reprocesados de webhooks y guarda estado.

## Slugs Canónicos

Fijar un mapa único y estable:

- `ofertas_hubspot`
- `sat_gestion`
- `ltd_score`
- `admin_core` (si se decide cobrar también admin)

Mantener alias solo para compatibilidad temporal; el canon debe ser único.

## Billing Desasistido (Stripe)

## Flujo mínimo

1. Admin crea checkout (`tenant_id`, `app_slug` canónico).
2. Stripe confirma `checkout.session.completed`.
3. Webhook registra/actualiza suscripción.
4. Se activa/desactiva `tenant_apps` según estado Stripe.
5. UI de permisos solo permite asignar apps contratadas.

## Estados y mapping

- `active`, `trialing` => activo
- `past_due`, `unpaid` => activo con riesgo de cobro
- `canceled`, `incomplete_expired` => inactivo

## Hardening técnico

- Idempotencia por `stripe_event_id`.
- Reintentos seguros ante fallos.
- Registro de errores por evento.
- Alertas si hay eventos fallidos repetidos.

## Multitenancy y Seguridad

## RLS obligatorio

- Política por `tenant_id` en todas las tablas de negocio.
- Prohibido acceso cross-tenant desde cliente.
- Service role solo en Railway para operaciones server-side.

## Seguridad de secretos

- Variables por entorno (dev/staging/prod).
- Rotación programada de claves críticas (Stripe/Supabase).
- Nunca exponer `SUPABASE_SERVICE_KEY` en frontend.

## Auditoría

- Registrar:
  - cambios de contrato por tenant
  - cambios de permisos por usuario
  - operaciones manuales de soporte
- Trazabilidad con quién/cuándo/qué/cambio anterior/nuevo.

## Observabilidad y SRE mínimo

## Métricas

- Webhooks recibidos/procesados/fallidos.
- Tiempo de activación desde pago hasta entitlement activo.
- Errores por endpoint y por app.
- Fallos de login/autorización por tenant.

## Alertas

- p95 latencia webhook
- tasa de errores 5xx
- eventos Stripe fallidos consecutivos
- divergencias entre `subscriptions` y `tenant_apps`

## Runbooks obligatorios

- Incidencia de cobro sin activación
- Activación sin cobro (rollback)
- Revocación de acceso urgente
- Restauración por fallo de migración

## Operación de Monorepo

## Convención

- Cada app con `netlify.toml` y build command de raíz.
- Servicios backend dentro de `services/`.
- Librerías compartidas dentro de `core-saas`.
- Docs en `/docs` como fuente oficial de operación.

## Reglas de cambios

- Cualquier cambio de contrato SaaS exige:
  - migración SQL
  - actualización de documento de contrato
  - prueba de build apps afectadas
  - entrada en `docs/agent-worklog.md`

## Puerta de Calidad Antes de Nueva App

No se inicia una nueva app hasta cumplir:

1. Billing idempotente validado en producción.
2. Entitlements sincronizados sin tareas manuales.
3. Admin bloquea asignaciones sobre apps no contratadas.
4. RLS auditado en tablas críticas.
5. Runbooks + alertas activas.
6. Onboarding de tenant reproducible extremo a extremo.

## Plan de Ejecución (30/60/90)

## 0-30 días

- Aplicar migraciones baseline de billing/entitlements.
- Cerrar huecos de `leadstodeals-admin` (usuarios, apps, contratos).
- Validar end-to-end con tenant real de prueba.

## 31-60 días

- Añadir auditoría completa y alertas operativas.
- Implementar reconciliación automática Stripe <-> Supabase.
- Preparar entorno staging con smoke tests.

## 61-90 días

- Endurecer onboarding comercial 100% desasistido.
- Medir y optimizar conversión trial->pago.
- Escalar playbook a nuevas apps verticales con el mismo contrato.

## Definición de Éxito

- Alta de tenant, compra, activación y acceso funcionan sin intervención humana.
- Incidencias se resuelven con runbook en minutos.
- Una app nueva se integra sin reinventar arquitectura base.
- El sistema es suficientemente robusto para crecer en volumen sin deuda explosiva.
