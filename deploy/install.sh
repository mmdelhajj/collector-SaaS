#!/usr/bin/env bash
# ISP SaaS — first-time provisioning script for an Ubuntu 22.04 host.
#
# Run as root. It is *idempotent* — re-running won't break a working host,
# but you should still review each step before pasting it onto a real box.
#
# What it does:
#   1. Installs PHP 8.3, Postgres 16, Redis 7, nginx-friendly toolchain, Caddy.
#   2. Creates the `isp-saas` system user.
#   3. Sets up /srv/isp-saas tree + log dir.
#   4. Drops in the systemd units.
#   5. Enables Horizon + scheduler + web + api.
#
# It does NOT:
#   - Clone/copy the source code (do that yourself or via your CI/CD).
#   - Set DNS, write secrets, or run migrations (run `deploy.sh` for that).

set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }

echo "==> apt update + base packages"
apt-get update -y
apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg lsb-release software-properties-common ufw \
    git unzip make build-essential

echo "==> PHP 8.3"
add-apt-repository -y ppa:ondrej/php
apt-get update -y
apt-get install -y --no-install-recommends \
    php8.3 php8.3-fpm php8.3-cli php8.3-pgsql php8.3-redis php8.3-mbstring \
    php8.3-xml php8.3-curl php8.3-gd php8.3-intl php8.3-bcmath php8.3-zip

echo "==> Composer"
if ! command -v composer >/dev/null; then
    curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

echo "==> Node 22 + pnpm"
if ! command -v node >/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs
fi
if ! command -v pnpm >/dev/null; then
    npm i -g pnpm@10
fi

echo "==> PostgreSQL 16"
apt-get install -y postgresql-16 postgresql-client-16

echo "==> Redis 7"
apt-get install -y redis-server
systemctl enable --now redis-server

echo "==> Caddy"
if ! command -v caddy >/dev/null; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y
    apt-get install -y caddy
fi

echo "==> System user + directories"
id isp-saas &>/dev/null || useradd --system --create-home --shell /usr/sbin/nologin isp-saas
mkdir -p /srv/isp-saas /var/log/isp-saas
chown -R isp-saas:isp-saas /srv/isp-saas /var/log/isp-saas

echo "==> Systemd units"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp "$SCRIPT_DIR"/systemd/*.service /etc/systemd/system/
cp "$SCRIPT_DIR"/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable isp-saas-scheduler.timer

echo "==> Firewall (allow 22, 80, 443)"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

cat <<EOF

✅ Base provisioning complete.

Next steps (manual):
  1. Set up Postgres user + db:
        sudo -u postgres createuser -P isp_saas
        sudo -u postgres createdb -O isp_saas isp_saas
  2. Push the code into /srv/isp-saas (git clone, rsync, etc.) — owned by isp-saas:isp-saas.
  3. Copy backend/.env.example -> backend/.env and fill in:
        APP_KEY (php artisan key:generate)
        DB_*    (Postgres creds above)
        QUEUE_CONNECTION=redis
        APP_ENV=production
        APP_DEBUG=false
        APP_URL=https://api.example.com
  4. Install + migrate:
        cd /srv/isp-saas/backend
        sudo -u isp-saas composer install --no-dev --optimize-autoloader
        sudo -u isp-saas php artisan migrate --force
        sudo -u isp-saas php artisan db:seed --force
  5. Build the web admin:
        cd /srv/isp-saas/web-admin
        sudo -u isp-saas pnpm install --frozen-lockfile
        sudo -u isp-saas pnpm build
  6. Edit /etc/caddy/Caddyfile (use the file in deploy/Caddyfile as a template),
     then: systemctl reload caddy
  7. Start everything:
        systemctl enable --now isp-saas-api.service isp-saas-web.service isp-saas-horizon.service

EOF
