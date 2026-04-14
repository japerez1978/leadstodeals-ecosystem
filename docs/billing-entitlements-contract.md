# Billing + Entitlements Contract (Baseline)

## Objetivo

Definir el contrato canónico para un flujo de cobro desasistido:

`checkout -> webhook -> subscriptions -> tenant_apps -> user_app_access`.

Este contrato evita estados inconsistentes y permite escalar a miles de empresas con comportamiento determinista.

## Principios

- Un evento de Stripe se procesa una sola vez (`billing_events`).
- La suscripción es la fuente de verdad comercial (`subscriptions`).
- La habilitación por tenant vive en `tenant_apps`.
- El permiso por usuario vive en `user_app_access`.
- Acceso efectivo = app activa para tenant + app asignada al usuario.

## Modelo mínimo

- `subscriptions`
  - `tenant_id`
  - `app_slug`
  - `estado`
  - `stripe_subscription_id`
  - `stripe_price_id`
  - `current_period_end`
- `tenant_apps`
  - `tenant_id`
  - `app_slug`
  - `activa`
- `user_app_access`
  - `tenant_id`
  - `auth_user_id`
  - `app_slug`
- `billing_events`
  - `stripe_event_id` (unique)
  - `event_type`
  - `status` (`received|processed|failed`)
  - `payload`
  - `error_message`

## Estados Stripe -> Estado interno

- `active` -> `activo`
- `trialing` -> `activo`
- `past_due` -> `past_due`
- `unpaid` -> `impagado`
- `incomplete` -> `incompleto`
- `incomplete_expired` -> `cancelado`
- `canceled` -> `cancelado`

## Regla de entitlement

Entitlement activo para tenant cuando `stripe_status` es:

- `active`
- `trialing`
- `past_due`
- `unpaid`

En `canceled` e `incomplete_expired`, `tenant_apps.activa = false`.

## Flujo operativo

1. Se crea Checkout Session con metadata:
   - `tenant_id`
   - `app_slug` normalizado
2. Stripe envía `checkout.session.completed`.
3. Backend procesa webhook idempotente:
   - registra/actualiza `subscriptions`
   - activa `tenant_apps`
   - marca `billing_events` como `processed`
4. Stripe envía updates/deletes posteriores.
5. Backend ajusta `subscriptions.estado` y `tenant_apps.activa`.
6. Frontend permite acceso solo si:
   - `tenant_apps.activa = true`
   - `user_app_access` contiene `app_slug`

## Reglas de implementación

- Siempre normalizar slugs (ej: `ofertas` -> `ofertas_hubspot`, `scoring` -> `ltd_score`).
- Nunca conceder acceso por usuario a apps no contratadas para el tenant.
- Si falla procesamiento de webhook, devolver `500` para retry de Stripe.
- Mantener logs de error en `billing_events.error_message`.

## Compatibilidad actual

El backend de `leadstodeals-admin/server.js` aplica este baseline con fallback seguro si la tabla `billing_events` aún no existe.

Para cerrar el contrato al 100%, aplicar migración:

- `leadstodeals-admin/supabase/migrations/20260414_billing_entitlements_baseline.sql`
