# INTRANOX HubSpot Proxy

Servidor Node.js mínimo (sin dependencias externas) que actúa de puente
entre la calculadora de presupuestos y el objeto personalizado **Ofertas**
de HubSpot, resolviendo el problema de CORS.

---

## Deploy en Railway (gratis)

1. **Sube este código a GitHub**
   ```bash
   git init
   git add .
   git commit -m "intranox proxy"
   # Crea un repo en github.com y sigue sus instrucciones
   git push
   ```

2. **Crea un proyecto en Railway**
   - Ve a [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
   - Selecciona tu repositorio

3. **Añade las variables de entorno** en Railway:
   | Variable | Valor |
   |---|---|
   | `HS_TOKEN` | `pat-eu1-tu-token-aqui` |
   | `HS_OBJECT_ID` | `2-198173351` |
   | `ALLOWED_ORIGIN` | `*` |

4. **Railway desplegará automáticamente** y te dará una URL pública:
   ```
   https://intranox-proxy-xxxx.railway.app
   ```

5. **Copia esa URL** y pégala en el campo "URL del proxy" de la calculadora.

---

## Desarrollo local

```bash
# Copia las variables de entorno
cp .env.example .env
# Edita .env con tu token real

# Arranca el servidor
node server.js
# → Corriendo en http://localhost:3000
```

---

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Comprueba que el servidor está en pie |
| `GET` | `/properties` | Lista todas las propiedades del objeto Ofertas |
| `GET` | `/ofertas` | Últimas 20 ofertas |
| `POST` | `/ofertas/search` | Búsqueda con filtros |
| `POST` | `/ofertas` | Crear nueva oferta |
| `PATCH` | `/ofertas/:id` | Actualizar oferta existente |

---

## Seguridad

- El token de HubSpot **nunca** sale del servidor — la calculadora no lo conoce
- Para restringir el acceso, cambia `ALLOWED_ORIGIN` a la URL exacta donde
  sirves la calculadora (ej. `https://tu-empresa.com`)
