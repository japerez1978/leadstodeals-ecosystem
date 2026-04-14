# Ecosystem Note

Este servicio ya esta integrado dentro del monorepo como ubicacion oficial.

## Estado actual

- La carpeta oficial es `services/intranox-proxy`.
- La carpeta legacy `calculadora presupuestos intranox` se mantiene sin tocar para no romper el deploy actual.
- No se ha cambiado ninguna URL de Railway ni ningun consumo en produccion.

## Siguiente paso recomendado

Cuando quieras hacer la migracion completa:

1. Apuntar Railway al codigo de `services/intranox-proxy`.
2. Verificar `/health` y los endpoints de HubSpot.
3. Solo entonces archivar o borrar la carpeta legacy.
