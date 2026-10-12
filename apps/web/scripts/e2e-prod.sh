#!/bin/sh
# Pruebas E2E con sesión contra producción (cuentas demo). Lee la contraseña demo y la anon key
# del .env del servidor por SSH, sin imprimirlas. Ejecutar desde apps/web:
#   sh scripts/e2e-prod.sh                 # anónimas + con sesión
#   sh scripts/e2e-prod.sh --project=prod-auth
set -eu
HOST=root@2.25.244.18
ENVF=/opt/cotizapro-deploy/.env
read_var() { ssh -o BatchMode=yes "$HOST" "grep -E '^$1=' $ENVF | cut -d= -f2-"; }
SEED_DEMO_PASSWORD="$(read_var SEED_DEMO_PASSWORD)"
PROD_ANON_KEY="$(read_var ANON_KEY)"
export SEED_DEMO_PASSWORD PROD_ANON_KEY
export NEXT_PUBLIC_SUPABASE_URL=https://api.cotizapro.mariobustos.io
export NEXT_PUBLIC_SUPABASE_ANON_KEY="$PROD_ANON_KEY"
export PROD_API_URL=https://api.cotizapro.mariobustos.io
export PLAYWRIGHT_TEST_BASE_URL=https://cotizapro.mariobustos.io
exec pnpm exec playwright test -c playwright.prod.config.ts "$@"
