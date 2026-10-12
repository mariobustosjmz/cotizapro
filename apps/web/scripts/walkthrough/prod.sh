#!/bin/sh
# Recorrido real en producción + PDF. Ejecutar desde apps/web:  sh scripts/walkthrough/prod.sh
# Crea un negocio de prueba "Vidrios Sierra Madre <n>" en producción; la contraseña aleatoria queda en
# docs/handoff/recorrido-prod/credenciales.txt (no se versiona).
set -eu
pnpm exec tsx scripts/walkthrough/run.ts https://cotizapro.mariobustos.io
pnpm exec tsx scripts/walkthrough/report.ts prod
open ../../docs/handoff/recorrido-prod/recorrido-cotizapro-prod.pdf 2>/dev/null || true
