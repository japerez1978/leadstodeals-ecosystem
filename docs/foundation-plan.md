# LeadsToDeals Ecosystem Foundation Plan

## Objetivo

Definir la arquitectura basal, las reglas de construccion y el proceso operativo del ecosistema `LeadsToDeals` antes de seguir creando nuevas aplicaciones.

Este plan busca asegurar:

- coherencia tecnica
- escalabilidad multitenant
- velocidad de desarrollo
- seguridad de datos
- despliegue repetible
- mantenibilidad del ecosistema

La idea central es simple: antes de crear mas producto, convertir el monorepo actual en una plataforma interna seria.

---

## 1. Principio Rector

No construir mas apps hasta que existan estas 4 bases:

1. Base tecnica unificada
2. Base multitenant segura
3. Base de producto compartida en `core-saas`
4. Base operativa de desarrollo, despliegue y gobierno

Sin esas cuatro capas, cada app nueva anade deuda. Con ellas, cada app nueva multiplica valor.

---

## 2. Resultado Esperado

Al terminar esta fase, el ecosistema debe permitir:

- crear una nueva app siguiendo una plantilla estandar
- reutilizar auth, tenant, UI, datos y permisos
- desplegar cualquier app con una receta unica
- garantizar aislamiento de datos por tenant
- mantener consistencia visual y tecnica
- saber exactamente que va al core y que se queda en cada app

---

## 3. Alcance de Esta Fase

Esta fase no consiste en anadir nuevas funcionalidades de negocio. Consiste en preparar la plataforma.

Incluye:

- monorepo
- `core-saas`
- auth
- tenant
- permisos
- diseno
- datos
- integraciones
- observabilidad
- despliegue
- documentacion
- procesos de desarrollo

No incluye:

- nuevos modulos de negocio
- nuevas apps
- features comerciales no necesarias para la base

---

## 4. Arquitectura Objetivo

### 4.1 Monorepo

La raiz del repo debe ser la fuente de verdad.

Debe contener:

- workspaces
- lockfile unico
- scripts unicos de build/dev/lint/test
- documentacion del ecosistema
- reglas de creacion de nuevas apps

Estructura recomendada:

```text
/
  package.json
  package-lock.json
  README.md
  MONOREPO-NETLIFY.md
  docs/
  apps/
    leadstodeals-admin/
    leadstodeals-scoring/
    intranox-ofertas/
    sats-saltoki/
  packages/
    core-saas/
```

Si no quieres mover carpetas aun, puedes mantener la estructura actual, pero el modelo conceptual debe ser ese:

- `apps/` = productos
- `packages/` = piezas compartidas

### 4.2 Core Platform

`core-saas` debe dejar de ser solo utilidades y convertirse en plataforma interna.

Estructura recomendada:

```text
core-saas/
  src/
    auth/
    tenant/
    permissions/
    data/
    integrations/
    ui/
    design/
    hooks/
    layouts/
    routing/
    utils/
    config/
    types/
```

### 4.3 Apps

Cada app debe contener solo:

- pantallas
- flujos
- logica de negocio especifica
- adaptadores especificos de ese dominio

No debe reimplementar:

- login
- contexto tenant
- guardas de permisos
- cliente Supabase
- sistema visual base
- componentes genericos
- patrones transversales

---

## 5. Decisiones Arquitectonicas Obligatorias

### 5.1 Stack Unificado

Antes de seguir, todas las apps deben compartir:

- React 19
- Vite 8
- Tailwind v4
- ESLint unificado
- misma estrategia de rutas
- misma estrategia de estado remoto
- mismas convenciones de imports

No puede haber apps "antiguas" conviviendo indefinidamente con stacks distintos.

### 5.2 Convencion de Paquetes

Todo lo compartido va en `core-saas`. Todo lo especifico se queda en la app.

Regla:

- si lo usan 2 apps o mas, candidato a core
- si expresa identidad del ecosistema, core
- si es de dominio exclusivo, app
- si hay duda, nace en la app y se sube al core al repetirse

### 5.3 Convencion de Build

Cada app debe tener:

- `dev`
- `build`
- `lint`
- `test` si aplica
- `preview`

La raiz debe tener:

- `build:admin`
- `build:scoring`
- `build:ofertas`
- `build:sats`
- `build:fee`
- `build:all`

Nunca usar un unico `build` ambiguo para el repo.

---

## 6. Arquitectura Multitenant

### 6.1 Modelo Base

Toda entidad de negocio tenant-aware debe llevar:

- `tenant_id`
- `created_at`
- `updated_at`
- `created_by` si aplica
- `status` cuando tenga sentido

### 6.2 Supabase

La estrategia elegida es valida:

- base de datos unica
- aislamiento logico por `tenant_id`
- RLS como frontera de seguridad

### 6.3 Requisitos Obligatorios

Antes de seguir creciendo, debes cerrar:

- politica formal de tablas multitenant
- politica formal de RLS por tipo de tabla
- estrategia de roles
- estrategia de service role
- estrategia de auditoria

### 6.4 Clasificacion de Tablas

Debes clasificar todas las tablas en 3 grupos:

1. Globales
2. Tenant-scoped
3. Internas de plataforma

Ejemplos:

- Globales: catalogo de apps, planes, configuraciones del sistema
- Tenant-scoped: leads, ofertas, tickets SAT, matrices, usuarios internos del tenant
- Internas de plataforma: logs, jobs, auditoria, sincronizaciones, webhooks

### 6.5 RLS

Debe existir una guia explicita para:

- como se resuelve el tenant actual
- como se valida acceso
- que tablas usan lectura/escritura por usuario
- que procesos usan service role
- como se evita fuga cross-tenant

### 6.6 Indices

Toda tabla tenant-scoped debe revisar indices para:

- `tenant_id`
- busquedas frecuentes
- filtros por estado/fecha
- joins mas usados

Sin esto, miles de clientes degradaran rendimiento.

---

## 7. Auth y Permisos

### 7.1 Auth Centralizada

Toda autenticacion debe pasar por un modulo compartido en `core-saas/auth`.

Debe incluir:

- sesion actual
- login/logout
- recuperacion de usuario
- refresh
- proteccion de rutas
- gestion de errores comunes

### 7.2 Modelo de Acceso

Debe existir un modelo claro:

- `tenant`
- `user`
- `role`
- `permission`
- `app_access`

No basta con "este usuario entra". Hay que saber:

- a que tenant pertenece
- que apps puede usar
- que acciones puede ejecutar

### 7.3 Guardas Compartidas

Crear en core:

- `RequireAuth`
- `RequireTenant`
- `RequirePermission`
- `RequireAppAccess`

---

## 8. Core-SaaS como Plataforma

### 8.1 Que debe ir a core

- sistema de diseno
- layout base
- navegacion comun
- auth
- tenant context
- permisos
- data client
- wrappers de React Query
- formularios comunes
- tablas comunes
- estados vacios
- loaders
- toasts
- modales
- utilidades
- configuracion global

### 8.2 Que no debe ir a core

- scoring especifico
- reglas comerciales especificas
- plantillas de ofertas de un caso concreto
- flujos SAT particulares
- pantallas administrativas exclusivas
- hacks temporales de una app

### 8.3 Objetivo de Core

Que una app nueva se monte ensamblando piezas, no inventando infraestructura.

---

## 9. Sistema de Diseno

### 9.1 Design System

Debes formalizarlo. No basta con "tenemos glassmorphism".

Debe haber:

- tokens de color
- tokens de spacing
- tipografia
- radios
- sombras
- transparencias
- estados
- breakpoints
- iconografia
- patrones de motion

### 9.2 Libreria UI

Crear catalogo base de componentes:

- `Button`
- `Input`
- `Select`
- `Textarea`
- `Modal`
- `Drawer`
- `Card`
- `Table`
- `Badge`
- `Tabs`
- `Toast`
- `EmptyState`
- `Skeleton`
- `PageHeader`

### 9.3 Regla

Ninguna app deberia inventarse su propio componente base salvo necesidad real.

---

## 10. Data Layer

### 10.1 Cliente Compartido

Centralizar en core:

- cliente Supabase
- cliente HubSpot proxy
- fetch wrappers
- manejo de errores
- retry policies
- invalidacion de cache

### 10.2 React Query

Definir reglas para:

- keys
- invalidacion
- stale time
- optimistic updates
- errores globales
- loaders

### 10.3 Dominio

Separar:

- hooks compartidos
- servicios compartidos
- hooks especificos por app

---

## 11. Integraciones

### 11.1 HubSpot

Antes de escalar, debes definir:

- capa adaptadora unica
- rate limiting
- retries
- trazabilidad
- mapeos de campos
- jobs async para sincronizacion

No conectar cada app directamente de manera distinta.

### 11.2 Webhooks y Jobs

Toda integracion externa importante debe pasar por:

- cola o job runner
- logs
- reintentos
- dead-letter strategy si aplica

---

## 12. Observabilidad y Operacion

### 12.1 Logs

Necesitas logs con contexto minimo:

- app
- tenant
- user
- accion
- resultado
- error id

### 12.2 Monitoring

Definir:

- errores frontend
- errores backend
- jobs fallidos
- integraciones fallidas
- tiempos de respuesta
- uso por tenant

### 12.3 Auditoria

Acciones sensibles deben quedar trazadas:

- cambios de permisos
- cambios de tenant
- acciones administrativas
- generacion de ofertas
- sincronizaciones criticas

---

## 13. Despliegue

### 13.1 Netlify

Cada sitio debe tener:

- build command propio
- publish directory propio
- variables de entorno claras
- entorno preview/production definido

### 13.2 Entornos

Definir como minimo:

- local
- preview
- production

Y para cada uno:

- variables
- URLs
- claves
- comportamiento esperado

### 13.3 Regla

No depender de conocimiento "de cabeza" para desplegar. Todo debe quedar documentado.

---

## 14. Testing

### 14.1 Base minima

Antes de crecer mas:

- tests unitarios en utilidades core
- tests de integracion en auth y tenant
- tests de flujos criticos
- smoke tests de build por app

### 14.2 Prioridad

No hace falta testear todo. Si hace falta testear la base compartida.

Prioridad:

1. auth
2. tenant
3. permisos
4. RLS
5. data layer
6. integraciones criticas

---

## 15. Seguridad

### 15.1 Checklist minimo

- revision de RLS
- secretos fuera del frontend
- service role aislado
- validacion de permisos en servidor cuando aplique
- sanitizacion de entradas
- politicas de acceso por app

### 15.2 Riesgo principal

En un SaaS multitenant, el mayor fallo posible es mezcla de datos entre tenants. Todo el diseno debe priorizar evitar eso.

---

## 16. Proceso de Desarrollo

### 16.1 Flujo para nueva funcionalidad

1. decidir si va a core o a app
2. definir contrato de datos
3. revisar permisos
4. disenar UI segun design system
5. implementar
6. validar tenant isolation
7. testear
8. desplegar preview
9. documentar

### 16.2 Flujo para nueva app

No crearla hasta cumplir checklist:

- comparte auth
- comparte tenant
- comparte core
- tiene caso de uso del ecosistema
- tiene build script
- tiene deploy recipe
- tiene estructura estandar

### 16.3 ADRs

Empieza a guardar decisiones de arquitectura.

Crear:

```text
docs/adr/
```

Y registrar decisiones como:

- por que Supabase + RLS
- por que monorepo
- que entra en core
- como se modelan permisos
- como se integra HubSpot

---

## 17. Documentacion Obligatoria

Debes salir de esta fase con estos documentos:

- `README.md` raiz
- `docs/architecture.md`
- `docs/multitenancy.md`
- `docs/auth-permissions.md`
- `docs/design-system.md`
- `docs/deployments.md`
- `docs/new-app-checklist.md`
- `docs/core-saas-boundaries.md`
- `docs/adr/*`

---

## 18. Roadmap de Consolidacion

### Fase A: Unificacion Tecnica

- unificar versiones
- lockfile unico
- workspaces definitivos
- scripts raiz
- builds reproducibles

### Fase B: Plataforma Core

- reestructurar `core-saas`
- mover auth/tenant/permissions/data/ui
- limpiar duplicaciones
- definir limites

### Fase C: Multitenancy Formal

- auditar tablas
- auditar RLS
- definir roles y permisos
- documentar service-role usage

### Fase D: Operacion

- despliegue documentado
- observabilidad
- logs
- auditoria
- testing base

### Fase E: Plantilla de Nueva App

- app starter interna
- checklist
- convenciones
- onboarding tecnico

---

## 19. Definition of Done

No se crea una app nueva hasta que:

- existe lockfile raiz
- todas las apps activas comparten stack base
- `core-saas` tiene estructura formal
- auth y tenant estan centralizados
- permisos estan modelados
- RLS esta auditado
- despliegues estan documentados
- existe checklist de nueva app
- existe documentacion tecnica raiz
- al menos los builds principales funcionan desde raiz

---

## 20. Recomendacion Ejecutiva

Si yo estuviera llevando este proyecto, pararia el desarrollo de nuevas apps durante 2 a 4 semanas y haria solo esto:

- consolidar monorepo
- profesionalizar `core-saas`
- blindar multitenancy
- estandarizar despliegue
- documentar normas del ecosistema

Eso te retrasara un poco hoy, pero te ahorrara muchisimo caos dentro de 3 a 6 meses.

### Prioridad Maxima

Si tuviera que reducir todo a 5 entregables concretos, haria estos:

1. Unificar stack y builds de todas las apps
2. Reestructurar `core-saas`
3. Formalizar auth, tenant y permisos
4. Auditar modelo multitenant + RLS
5. Documentar proceso de nueva app y despliegue
