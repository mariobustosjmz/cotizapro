#!/usr/bin/env bash
# =============================================================
# CotizaPro — Initial Server Setup Script
# Run ONCE on a fresh Ubuntu 22.04 / Debian 12 VM
#
# Usage:
#   ssh root@YOUR_SERVER_IP 'bash -s' < scripts/setup-server.sh
#
# After setup, deploy with:
#   ./scripts/deploy.sh deploy@YOUR_SERVER_IP
# =============================================================
set -euo pipefail

APP_DIR="/var/www/cotizapro"
APP_USER="deploy"
APP_PORT=3000

log()  { echo ""; echo ">>> $*"; }
ok()   { echo "    [OK] $*"; }

log "CotizaPro Server Setup (Ubuntu 22.04)"

# ----------------------------------------------------------
log "[1/7] Updating system packages..."
# ----------------------------------------------------------
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl git nginx ufw build-essential psql
ok "System updated"

# ----------------------------------------------------------
log "[2/7] Creating deploy user..."
# ----------------------------------------------------------
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
  echo "    User '$APP_USER' created"
else
  echo "    User '$APP_USER' already exists"
fi

# Copy SSH keys from root to deploy user
if [[ -f /root/.ssh/authorized_keys ]]; then
  mkdir -p "/home/$APP_USER/.ssh"
  cp /root/.ssh/authorized_keys "/home/$APP_USER/.ssh/"
  chown -R "$APP_USER:$APP_USER" "/home/$APP_USER/.ssh"
  chmod 700 "/home/$APP_USER/.ssh"
  chmod 600 "/home/$APP_USER/.ssh/authorized_keys"
fi
ok "Deploy user ready (SSH keys copied from root)"

# ----------------------------------------------------------
log "[3/7] Installing Node.js 20 via nvm..."
# ----------------------------------------------------------
sudo -u "$APP_USER" bash << 'NVM_INSTALL'
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi
source "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20
echo "    Node: $(node --version)"
echo "    npm:  $(npm --version)"
NVM_INSTALL
ok "Node.js 20 installed"

# ----------------------------------------------------------
log "[4/7] Installing pnpm and PM2..."
# ----------------------------------------------------------
sudo -u "$APP_USER" bash << 'PKG_INSTALL'
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
npm install -g pnpm pm2
echo "    pnpm: $(pnpm --version)"
echo "    pm2:  $(pm2 --version)"
PKG_INSTALL

# Register PM2 startup
sudo -u "$APP_USER" bash -c "
  export NVM_DIR=\"\$HOME/.nvm\"
  source \"\$NVM_DIR/nvm.sh\"
  pm2 startup systemd -u $APP_USER --hp /home/$APP_USER 2>/dev/null || true
" || true
ok "pnpm and PM2 installed"

# ----------------------------------------------------------
log "[5/7] Creating app directory..."
# ----------------------------------------------------------
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"
ok "Directory: $APP_DIR"

# ----------------------------------------------------------
log "[6/7] Configuring Nginx..."
# ----------------------------------------------------------
cat > /etc/nginx/sites-available/cotizapro << NGINX
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

    # Proxy to Next.js
    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check (no cache)
    location /api/health {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_set_header Host \$host;
        add_header Cache-Control "no-cache, no-store";
    }

    # Next.js static assets (long cache)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:$APP_PORT;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    client_max_body_size 10M;
}
NGINX

ln -sf /etc/nginx/sites-available/cotizapro /etc/nginx/sites-enabled/cotizapro
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
ok "Nginx configured and running"

# ----------------------------------------------------------
log "[7/7] Configuring UFW firewall..."
# ----------------------------------------------------------
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "Firewall: SSH + HTTP + HTTPS allowed"

# ----------------------------------------------------------
echo ""
echo "========================================"
echo "  Server setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Fill in .env.production on your local machine"
echo "  2. From your local machine run:"
echo "     ./scripts/deploy.sh deploy@$(hostname -I | awk '{print $1}')"
echo ""
echo "  Optional — SSL with Let's Encrypt:"
echo "     apt install certbot python3-certbot-nginx -y"
echo "     certbot --nginx -d yourdomain.com"
echo "========================================"
