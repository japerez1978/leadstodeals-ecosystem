# Railway Migration: Intranox Proxy

Este checklist sirve para mover Railway al servicio oficial del monorepo sin cortar produccion.

## Objetivo

Cambiar el origen de deploy a `services/intranox-proxy` manteniendo la misma URL publica del proxy.

## Pre-check

1. Confirmar que existe `services/intranox-proxy/server.js`.
2. Confirmar que el servicio actual responde `GET /health`.
3. Exportar variables actuales de Railway:
   - `HS_TOKEN`
   - `HS_OBJECT_ID`
   - `ALLOWED_ORIGIN`
   - `PORT` (si aplica)

## Cambio en Railway

1. Abrir el proyecto actual del proxy.
2. En Source/Root Directory, configurar `services/intranox-proxy`.
3. Mantener exactamente las mismas env vars.
4. Lanzar deploy manual del ultimo commit.

## Validacion post-deploy

1. `GET /health` devuelve `ok: true`.
2. `GET /ofertas` responde sin error.
3. `POST /ofertas/search` responde sin error.
4. `intranox-ofertas` sigue funcionando en produccion.
5. `leadstodeals-scoring` (si usa proxy HubSpot) sigue funcionando en produccion.

## Rollback rapido

Si algo falla:

1. Restaurar Root Directory al path anterior.
2. Redeploy inmediato.
3. Verificar `GET /health`.

## Cierre

Cuando este estable:

1. Marcar `services/intranox-proxy` como servicio oficial.
2. Archivar o borrar `calculadora presupuestos intranox`.
3. Actualizar documentacion interna para evitar ambiguedad.
