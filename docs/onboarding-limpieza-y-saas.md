# Onboarding de Trabajo: Limpieza, SaaS Base y Go-To-Market

## Objetivo

Dejar el ecosistema `LeadsToDeals` listo para vender suscripciones reales con una base limpia, sin restos de Vercel, con el monorepo ordenado y con una siguiente fase clara para `admin`, multitenancy y Stripe.

Este onboarding está pensado para ejecutarse por fases, sin mezclar limpieza técnica con rediseño de negocio.

---

## Estado de partida

A fecha de hoy:

- `sats-saltoki` ya despliega en Netlify
- `intranox-ofertas` ya despliega en Netlify
- `leadstodeals-scoring` ya despliega en Netlify
- `leadstodeals-admin` ya despliega en Netlify
- el backend/proxy real apunta a Railway
- Vercel ya no parece necesario para runtime

Conclusión:

La siguiente fase correcta ya no es de deploy. Es de consolidación.

---

## Fase 1: Retirada Definitiva de Vercel

### Objetivo

Eliminar Vercel como pieza activa de la arquitectura sin romper producción.

### Lo que ya está validado

- No hay funciones serverless activas de Vercel en el repo.
- Los `vercel.json` encontrados son solo rewrites a Railway.
- `admin` y `ofertas` ya llaman a Railway directamente en código.
- `scoring` depende de `VITE_PROXY_URL`, que ya puede apuntar a Railway.

### Restos de Vercel detectados en el repo

- `intranox-ofertas/vercel.json`
- `leadstodeals-scoring/vercel.json`
- `leadstodeals-admin/vercel.json`
- `leadstodeals-admin/.vercel`

### Checklist antes de borrarlo

1. Confirmar que los dominios productivos ya apuntan a Netlify y no a Vercel.
2. Confirmar que no quedan webhooks de Stripe o HubSpot apuntando a URLs de Vercel.
3. Confirmar que ningún equipo interno sigue usando `*.vercel.app`.
4. Confirmar que `VITE_PROXY_URL` en `scoring` apunta a Railway.

### Acción recomendada

Cuando el checklist anterior esté cerrado:

- borrar proyectos de Vercel desde el panel
- borrar `vercel.json` del repo
- borrar `leadstodeals-admin/.vercel`
- limpiar documentación antigua que hable de Vercel como pieza activa

### Criterio de éxito

El ecosistema queda en arquitectura:

- Netlify para frontend
- Railway para backend/proxy/webhooks
- Supabase para datos, auth y RLS

---

## Fase 2: Limpieza del Repo y Proyectos Repetidos

### Objetivo

Dejar el repositorio representando solo el ecosistema real y no una mezcla de apps activas, utilidades antiguas y migraciones incompletas.

### Inventario actual relevante

- `core-saas`
- `leadstodeals-scoring`
- `leadstodeals-admin`
- `intranox-ofertas`
- `sats-saltoki`
- `calculadora-fee`
- `calculadora presupuestos intranox`

### Hallazgo importante

Hay una incoherencia clara:

- `calculadora-fee` aparece como workspace del monorepo
- pero en disco no muestra una app real consolidada
- `calculadora presupuestos intranox` sí contiene archivos reales
- esa carpeta parece más una utilidad/proxy legacy que una app del ecosistema SaaS principal

### Decisión recomendada

No borrar directamente sin clasificar.

Primero decidir entre estas opciones:

#### Opción A: Es legacy y no forma parte del ecosistema

- sacarla del monorepo
- moverla a `archive/`
- o borrarla del repo si ya no aporta nada

#### Opción B: Debe formar parte del ecosistema

- renombrarla
- integrarla en una carpeta estándar
- darle estructura real de app o servicio
- dejar de mantener duplicados entre `calculadora-fee` y `calculadora presupuestos intranox`

### Regla de limpieza del repo

Se queda en el repo solo lo que cumpla al menos una:

- pertenece al ecosistema SaaS activo
- comparte `core-saas`
- comparte auth/tenant/infraestructura
- tiene roadmap real
- tiene owner técnico claro

### Criterio de éxito

El repo deja de tener piezas ambiguas o duplicadas.

---

## Fase 3: Modelo SaaS Canónico

### Objetivo

Definir una sola verdad para tenants, apps, usuarios, permisos y suscripciones.

### Problemas detectados

- mezcla conceptual entre acceso contratado y acceso permitido
- tablas y lógica inconsistentes entre `tenant_apps` y `user_app_access`
- slugs de apps no del todo homogéneos
- parte del comportamiento vive en frontend cuando debería vivir en backend

### Modelo objetivo

#### Tablas núcleo

- `tenants`
- `apps`
- `tenant_apps`
- `tenant_users`
- `user_app_access`
- `subscriptions`
- `audit_logs`

#### Separación clave

- `tenant_apps`: apps contratadas/activadas para una empresa
- `user_app_access`: apps permitidas para un usuario concreto dentro de esa empresa

### Regla de negocio

Un usuario solo puede usar una app si:

1. su tenant tiene esa app activa
2. el usuario tiene acceso concedido a esa app

### Criterio de éxito

Queda imposible mezclar “empresa tiene la app” con “usuario puede entrar”.

---

## Fase 4: Reconstrucción de `leadstodeals-admin`

### Objetivo

Convertir `admin` en el centro real de gobierno del SaaS.

### Qué debe hacer bien

- crear y editar empresas
- activar apps por empresa
- crear usuarios
- asignar usuarios a empresas
- dar o quitar acceso por app
- ver estado de suscripciones
- lanzar checkout o portal de cliente
- reflejar correctamente lo que Stripe activa o cancela

### Qué no debe hacer ya

- crear estados de negocio críticos solo desde frontend
- asumir accesos por tenant como si fuesen accesos por usuario
- depender de slugs inconsistentes

### Trabajo técnico esperado

- revisar páginas de tenants y users
- centralizar alta y asignaciones sensibles en backend Railway
- normalizar slugs de apps
- rehacer hooks de acceso compartidos

---

## Fase 5: Stripe Bien Cerrado

### Objetivo

Vender suscripciones reales y que el sistema active apps automáticamente.

### Arquitectura recomendada

- frontend en Netlify
- checkout y customer portal en Railway
- webhooks en Railway
- persistencia de estado en Supabase

### Flujo deseado

1. admin selecciona tenant y app
2. se crea checkout en Stripe
3. Stripe confirma pago
4. webhook actualiza `subscriptions`
5. webhook activa `tenant_apps`
6. desde `admin` se asigna acceso a usuarios

### Estados mínimos de suscripción

- `trial`
- `active`
- `past_due`
- `canceled`
- `incomplete`

### Regla crítica

La activación comercial no debe depender de clicks manuales dispersos si ya existe webhook de Stripe.

---

## Fase 6: Blindaje Multitenant

### Objetivo

Poder vender con tranquilidad sabiendo que no hay fugas de datos entre clientes.

### Trabajo obligatorio

- auditar RLS tabla por tabla
- revisar funciones RPC usadas por `admin`
- separar operaciones de frontend y service role
- revisar índices por `tenant_id`
- añadir trazabilidad básica

### Riesgo principal a evitar

Cruce de datos entre tenants o permisos incoherentes por usuario.

---

## Orden Recomendado de Ejecución

1. apagar Vercel definitivamente
2. limpiar proyectos ambiguos o legacy del repo
3. definir modelo SaaS canónico
4. reconstruir `leadstodeals-admin`
5. cerrar Stripe y activación automática
6. auditar multitenancy y RLS

---

## Qué Haría Yo Ya

### Semana 1

- retirar Vercel
- limpiar repo
- decidir destino de `calculadora-fee` y `calculadora presupuestos intranox`
- congelar nuevas apps

### Semana 2

- diseñar tablas y contratos SaaS
- normalizar slugs de apps
- definir reglas de acceso

### Semana 3

- rehacer `leadstodeals-admin`
- mover operaciones sensibles a Railway
- conectar bien Stripe con Supabase

### Semana 4

- auditar RLS
- probar onboarding de tenant
- probar alta de usuario
- probar compra y activación real

---

## Definition of Done

No se crea una app nueva hasta que:

- Vercel ha desaparecido de arquitectura y repo
- el repo no tiene proyectos ambiguos o duplicados
- existe un modelo SaaS único y documentado
- `leadstodeals-admin` gestiona bien empresas, usuarios y apps
- Stripe activa y desactiva apps de forma confiable
- RLS está auditado

---

## Decisión Ejecutiva

Sí, el orden correcto ahora es:

1. borrar Vercel
2. limpiar repo
3. profesionalizar `admin`
4. cerrar multitenancy y Stripe
5. empezar a vender sobre una base estable

Este es el punto en el que el proyecto deja de ser “varias apps desplegadas” y pasa a ser “un SaaS operable y vendible”.
