#!/bin/sh
# Semana real en producción, operada solo desde la interfaz, y su PDF. Ejecutar desde apps/web:
#   sh scripts/walkthrough/semana/prod.sh
# Crea el negocio de prueba "Cristalería Del Valle <n>" en producción. La contraseña aleatoria queda en
# docs/handoff/semana-prod/credenciales.txt (no se versiona). Respeta el límite de 100 peticiones / 15 min,
# así que la corrida completa puede tardar alrededor de una hora.
set -eu
pnpm exec tsx scripts/walkthrough/semana/run.ts https://cotizapro.mariobustos.io
pnpm exec tsx scripts/walkthrough/semana/report.ts prod
cat ../../docs/handoff/semana-prod/credenciales.txt
open ../../docs/handoff/semana-prod/semana-cotizapro-prod.pdf 2>/dev/null || true
