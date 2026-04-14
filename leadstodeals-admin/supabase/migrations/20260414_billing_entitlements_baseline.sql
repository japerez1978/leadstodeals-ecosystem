-- Baseline para billing desasistido y control de entitlements.
-- Objetivo: idempotencia de webhooks + consistencia de acceso por tenant/app.

-- 1) Registro de eventos de Stripe para idempotencia y trazabilidad.
create table if not exists billing_events (
  id              bigserial primary key,
  stripe_event_id text not null unique,
  event_type      text not null,
  status          text not null default 'received',
  payload         jsonb not null default '{}'::jsonb,
  error_message   text,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz
);

create index if not exists billing_events_status_idx
  on billing_events(status);

create index if not exists billing_events_received_at_idx
  on billing_events(received_at desc);

-- 2) Fortalecer subscripciones para evitar duplicados por Stripe subscription id.
alter table if exists subscriptions
  add column if not exists stripe_subscription_id text;

alter table if exists subscriptions
  add column if not exists stripe_price_id text;

alter table if exists subscriptions
  add column if not exists current_period_end timestamptz;

create unique index if not exists subscriptions_stripe_subscription_id_uq
  on subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists subscriptions_tenant_app_estado_idx
  on subscriptions(tenant_id, app_slug, estado);

-- 3) Garantizar unicidad de tenant_apps para upsert robusto.
create unique index if not exists tenant_apps_tenant_id_app_slug_uq
  on tenant_apps(tenant_id, app_slug);

create index if not exists tenant_apps_tenant_active_idx
  on tenant_apps(tenant_id, activa);

-- 4) Función auxiliar de lectura efectiva de acceso (tenant activo + permiso usuario).
create or replace function has_effective_app_access(
  p_auth_user_id uuid,
  p_tenant_id integer,
  p_app_slug text
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from tenant_users tu
    join tenant_apps ta
      on ta.tenant_id = tu.tenant_id
     and ta.app_slug = p_app_slug
     and ta.activa = true
    join user_app_access ua
      on ua.auth_user_id = tu.auth_user_id
     and ua.tenant_id = tu.tenant_id
     and ua.app_slug = p_app_slug
    where tu.auth_user_id = p_auth_user_id
      and tu.tenant_id = p_tenant_id
  );
$$;
