# INTRANOX HubSpot Proxy

Servicio backend del ecosystem para actuar de puente con HubSpot y evitar CORS.

## Estado

- Ubicacion oficial en el monorepo: `services/intranox-proxy`
- Mantiene compatibilidad de endpoints con el proxy actual en Railway
- No requiere dependencias externas (usa `http` y `https` nativos)

## Desarrollo local

Desde la raiz del monorepo:

```bash
npm run dev:proxy
```

O desde esta carpeta:

```bash
cp .env.example .env
npm run dev
```

## Variables de entorno

| Variable | Descripcion |
|---|---|
| `HS_TOKEN` | Token privado de HubSpot |
| `HS_OBJECT_ID` | ID del objeto de ofertas |
| `ALLOWED_ORIGIN` | Origen permitido para CORS (`*` por defecto) |
| `PORT` | Puerto local (`3000` por defecto) |

## Endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/health` | Estado del servicio |
| `GET` | `/properties` | Propiedades del objeto |
| `GET` | `/ofertas` | Ultimas ofertas |
| `POST` | `/ofertas/search` | Busqueda avanzada |
| `POST` | `/ofertas` | Crear oferta |
| `PATCH` | `/ofertas/:id` | Actualizar oferta |

## Migracion a Railway

1. Apunta Railway a este path: `services/intranox-proxy`.
2. Copia exactamente las mismas variables que tiene el servicio actual.
3. Verifica `GET /health`.
4. Haz una llamada real a `/ofertas` y a `/ofertas/search`.
5. Solo cuando todo este bien, archiva la carpeta legacy.
