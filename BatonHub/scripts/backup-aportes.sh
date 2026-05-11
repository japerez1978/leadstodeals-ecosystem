#!/bin/bash

# Script de backup automático de aportes
# Se ejecuta diariamente vía cron

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR" || exit 1

# Verificar si hay cambios en los datos
if ! git diff --quiet data/aportes.json 2>/dev/null; then
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    git add data/aportes.json
    git commit -m "backup: aportes actualizado - $TIMESTAMP"
    git push origin main
    echo "✓ Backup completado: $TIMESTAMP"
else
    echo "✓ Sin cambios en aportes.json"
fi
