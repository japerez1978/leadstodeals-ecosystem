# Monorepo y despliegue en Netlify

Este repositorio se despliega como monorepo.

La regla base es:

- `Base directory`: `/`
- `Build command`: uno especifico por proyecto
- `Publish directory`: la carpeta `dist` del proyecto correspondiente

## Sitios actuales

### SAT

- `Build command`: `npm run build:sats`
- `Publish directory`: `sats-saltoki/dist`

### Scoring

- `Build command`: `npm run build:scoring`
- `Publish directory`: `leadstodeals-scoring/dist`

### Admin

- `Build command`: `npm run build:admin`
- `Publish directory`: `leadstodeals-admin/dist`

### Ofertas

- `Build command`: `npm run build:ofertas`
- `Publish directory`: `intranox-ofertas/dist`

### Calculadora Fee

- `Build command`: `npm run build:fee`
- `Publish directory`: `calculadora-fee/dist`

## Notas

- No se debe usar un unico `npm run build` para todo el repositorio.
- Cada sitio de Netlify debe apuntar a su propio comando de build.
- `core-saas` se resuelve correctamente cuando Netlify instala desde la raiz del repo.
- Si un proyecto nuevo se anade al monorepo, hay que hacer tres cosas: incluirlo en `workspaces`, crear su script `build:<nombre>` en la raiz y configurar su sitio en Netlify con su `Publish directory`.
