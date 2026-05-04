#!/usr/bin/env bash
# Zero-downtime-ish deploy script. Pulls latest code, runs migrations + asset
# build, and restarts services. Run as root or via passwordless sudo.

set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }

REPO=/srv/isp-saas
BACKEND="$REPO/backend"
WEB="$REPO/web-admin"

echo "==> Pull latest"
sudo -u isp-saas git -C "$REPO" pull --ff-only

echo "==> Backend: composer install + migrate"
cd "$BACKEND"
sudo -u isp-saas composer install --no-dev --optimize-autoloader --no-interaction
sudo -u isp-saas php artisan migrate --force
sudo -u isp-saas php artisan config:cache
sudo -u isp-saas php artisan route:cache
sudo -u isp-saas php artisan view:cache

echo "==> Frontend: pnpm install + build"
cd "$WEB"
sudo -u isp-saas pnpm install --frozen-lockfile
sudo -u isp-saas pnpm build

echo "==> Restart services"
systemctl restart isp-saas-api.service
systemctl restart isp-saas-web.service
systemctl restart isp-saas-horizon.service

echo "==> Health check"
sleep 3
if curl -fsS http://127.0.0.1:8000/up >/dev/null; then
    echo "API ✅"
else
    echo "API ❌  (curl http://127.0.0.1:8000/up failed)"
    journalctl -u isp-saas-api.service -n 30 --no-pager
    exit 1
fi
if curl -fsS http://127.0.0.1:3000 >/dev/null; then
    echo "Web ✅"
else
    echo "Web ❌  (curl http://127.0.0.1:3000 failed)"
    journalctl -u isp-saas-web.service -n 30 --no-pager
    exit 1
fi

echo "🎉 Deploy complete."
