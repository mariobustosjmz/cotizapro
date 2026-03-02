#!/usr/bin/env bash
# =============================================================
# CotizaPro — SSH/VM Deployment Script
# =============================================================
# Usage:
#   ./scripts/deploy.sh deploy@YOUR_SERVER_IP
#   ./scripts/deploy.sh deploy@YOUR_SERVER_IP --branch main
#   ./scripts/deploy.sh deploy@YOUR_SERVER_IP --skip-migrations
#
# Requirements (local machine):
#   - SSH key configured for the target server
#   - .env.production file filled out
#   - pnpm installed
#
# Requirements (server):
#   - Run scripts/setup-server.sh first on the server
#   - deploy user with /var/www/cotizapro directory
# =============================================================
set -euo pipefail

APP_DIR="/var/www/cotizapro"
APP_NAME="cotizapro"
REPO_URL="git@github.com:mariobustosjmz/cotizapro.git"
BRANCH="main"
SKIP_MIGRATIONS=false

SSH_TARGET="${1:-}"
if [[ -z "$SSH_TARGET" ]]; then
  echo "Error: SSH target required"
  echo "Usage: ./scripts/deploy.sh user@server_ip [--branch BRANCH] [--skip-migrations]"
  exit 1
fi
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) BRANCH="$2"; shift 2 ;;
    --skip-migrations) SKIP_MIGRATIONS=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

log()  { echo ""; echo ">>> $*"; }
ok()   { echo "    [OK] $*"; }
warn() { echo "    [WARN] $*"; }
fail() { echo "    [FAIL] $*"; exit 1; }

log "CotizaPro SSH Deployment"
echo "    Target : $SSH_TARGET"
echo "    Branch : $BRANCH"
echo "    Migrations: $([ "$SKIP_MIGRATIONS" = true ] && echo skip || echo apply)"

# ----------------------------------------------------------
# Step 1: Pre-flight checks
# ----------------------------------------------------------
log "[1/6] Pre-flight checks..."

[[ -f ".env.production" ]] || fail ".env.production not found — create it from .env.production.example"
[[ -f "package.json" ]]    || fail "Run from project root"

if grep -q "REPLACE_WITH" .env.production 2>/dev/null; then
  warn ".env.production still has placeholder values:"
  grep "REPLACE_WITH" .env.production | cut -d= -f1 | sed 's/^/    /' || true
  echo ""
  read -rp "    Continue anyway? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || exit 1
fi

# Test SSH connection
ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_TARGET" "echo ok" > /dev/null 2>&1 \
  || fail "Cannot connect to $SSH_TARGET — check SSH key/host"
ok "SSH connection verified"

# ----------------------------------------------------------
# Step 2: Build locally
# ----------------------------------------------------------
log "[2/6] Building production bundle locally..."
NODE_ENV=production pnpm run build
ok "Build successful"

# ----------------------------------------------------------
# Step 3: Upload env + code
# ----------------------------------------------------------
log "[3/6] Uploading environment variables..."
scp .env.production "$SSH_TARGET:$APP_DIR/.env.production"
ok "Environment uploaded to $APP_DIR/.env.production"

log "[3b] Uploading build artifacts via rsync..."
rsync -az --delete \
  --exclude=".next/cache" \
  --exclude="node_modules" \
  .next/ "$SSH_TARGET:$APP_DIR/.next/"
rsync -az package.json pnpm-lock.yaml "$SSH_TARGET:$APP_DIR/"
ok "Build artifacts uploaded"

# ----------------------------------------------------------
# Step 4: Install deps on server + apply env
# ----------------------------------------------------------
log "[4/6] Pulling latest code + installing dependencies on server..."
ssh "$SSH_TARGET" bash << REMOTE
set -euo pipefail
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && source "\$NVM_DIR/nvm.sh"

echo "    Node: \$(node --version)"
echo "    pnpm: \$(pnpm --version 2>/dev/null || echo not found)"

# Clone or pull
if [ -d "$APP_DIR/.git" ]; then
  echo "    Pulling from GitHub..."
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  echo "    Cloning from GitHub..."
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

pnpm install --frozen-lockfile --prod=false
echo "    Dependencies installed"
REMOTE
ok "Code updated and dependencies installed"

# ----------------------------------------------------------
# Step 5: Apply migrations
# ----------------------------------------------------------
if [[ "$SKIP_MIGRATIONS" == "false" ]]; then
  log "[5/6] Applying database migrations..."
  # Supabase migrations run against remote DB via psql
  # The connection string uses the Supabase pooler (port 6543)
  ssh "$SSH_TARGET" bash << 'REMOTE_MIGRATE'
set -euo pipefail
cd /var/www/cotizapro
set -a; source .env.production; set +a

# Extract Supabase ref from URL: https://REF.supabase.co
SUPABASE_REF=$(echo "$NEXT_PUBLIC_SUPABASE_URL" | sed 's|https://||' | cut -d. -f1)
DB_PASS="${DB_PASSWORD:-}"

if [[ -z "$DB_PASS" ]]; then
  echo "    SKIP: DB_PASSWORD not set in .env.production"
  echo "    Manual: psql 'postgresql://postgres.${SUPABASE_REF}:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres' -f supabase/migrations/FILE.sql"
else
  CONN="postgresql://postgres.${SUPABASE_REF}:${DB_PASS}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
  for f in supabase/migrations/*.sql; do
    echo "    Applying: $f"
    psql "$CONN" -f "$f" --quiet || echo "    [skip] Already applied or error: $f"
  done
  echo "    Migrations done"
fi
REMOTE_MIGRATE
  ok "Migrations step complete"
else
  log "[5/6] Skipping migrations"
  ok "Skipped"
fi

# ----------------------------------------------------------
# Step 6: Restart with PM2
# ----------------------------------------------------------
log "[6/6] Restarting application..."
ssh "$SSH_TARGET" bash << REMOTE_RESTART
set -euo pipefail
export NVM_DIR="\$HOME/.nvm"
[ -s "\$NVM_DIR/nvm.sh" ] && source "\$NVM_DIR/nvm.sh"
cd $APP_DIR

# Load env
set -a; source .env.production; set +a

if pm2 list | grep -q "$APP_NAME"; then
  echo "    Reloading PM2 process..."
  pm2 reload "$APP_NAME" --update-env
else
  echo "    Starting new PM2 process..."
  pm2 start pnpm --name "$APP_NAME" -- start --port 3000
fi

pm2 save
echo ""
pm2 show "$APP_NAME" | grep -E "status|restart time|uptime" || true
REMOTE_RESTART
ok "Application restarted"

# ----------------------------------------------------------
# Health check
# ----------------------------------------------------------
echo ""
log "Health check..."
sleep 4
SSH_HOST=$(echo "$SSH_TARGET" | awk -F@ '{print $NF}')
HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "http://$SSH_HOST/api/health" 2>/dev/null || echo "000")

if [[ "$HTTP_STATUS" == "200" ]]; then
  ok "Health check passed (HTTP $HTTP_STATUS)"
else
  warn "Health check returned HTTP $HTTP_STATUS"
  echo "    Debug: ssh $SSH_TARGET 'pm2 logs $APP_NAME --lines 30'"
fi

echo ""
echo "========================================"
echo "  Deployment complete!"
echo ""
echo "  App:    http://$SSH_HOST"
echo "  Health: http://$SSH_HOST/api/health"
echo "  Logs:   ssh $SSH_TARGET 'pm2 logs $APP_NAME'"
echo "  Status: ssh $SSH_TARGET 'pm2 show $APP_NAME'"
echo "========================================"
