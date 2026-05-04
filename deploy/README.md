# Production deploy

This directory contains everything needed to run the ISP SaaS platform on a
single Ubuntu 22.04 host with TLS via Caddy. Designed for an MVP — once you
need horizontal scale, swap the systemd units for Docker/ECS/Fly.

## Files

| File | Purpose |
|---|---|
| `install.sh` | One-shot provisioning: PHP, Postgres, Redis, Caddy, systemd units. |
| `deploy.sh` | Pulls latest code, runs migrations, builds frontend, restarts services. |
| `Caddyfile` | TLS-terminated reverse proxy template. Replace the example domains. |
| `systemd/` | Unit files for the API, web admin, Horizon (queue), and scheduler. |
| `.env.production.example` | Template for the web-admin env file. Copy + edit. |

## Provisioning a fresh host

```bash
# As root on the new VPS:
curl -fsSL https://your-repo/deploy/install.sh -o install.sh
bash install.sh
```

Then follow the post-install checklist printed at the end.

## Pre-flight checklist before going live

Before exposing this to real customers, double-check:

- [ ] DNS A records: `app.example.com` and `api.example.com` → server IP.
- [ ] Caddyfile domains updated (currently `example.com` placeholder).
- [ ] `backend/.env`: `APP_ENV=production`, `APP_DEBUG=false`, real `APP_KEY`.
- [ ] `backend/.env`: `QUEUE_CONNECTION=redis` (default ships as `sync`).
- [ ] `backend/.env`: `RADIUS_API_SECRET` set + `RADIUS_ALLOWED_IPS` locked
      to your FreeRADIUS hosts.
- [ ] `backend/.env`: `SANCTUM_STATEFUL_DOMAINS=app.example.com`,
      `SESSION_DOMAIN=.example.com` (note the leading dot).
- [ ] Postgres `pg_hba.conf` only allows local connections from `isp-saas`.
- [ ] `web-admin/.env.production`: `AUTH_COOKIE_SECURE=true`.
- [ ] Run `php artisan migrate --force` and confirm no pending migrations.
- [ ] Run `php artisan db:seed --class=DatabaseSeeder --force` ONCE to seed
      demo tenants — skip this in real production unless you want demos.
- [ ] Cron / systemd timer is running the scheduler (`systemctl status isp-saas-scheduler.timer`).
- [ ] First-time admin: `php artisan tinker` →
      `User::find(1)->update(['email' => 'you@yourcompany.com']);`
- [ ] Backup plan in place: `pg_dump` to S3 nightly + offsite copies.
- [ ] Sentry DSN set in `backend/.env` and `web-admin/.env.production`.
- [ ] Test the 2FA enrolment flow end-to-end on a real authenticator app.
- [ ] Hit the RADIUS endpoints from a non-allowed IP and confirm 403.

## Routine ops

```bash
# Deploy a new release:
cd /srv/isp-saas/deploy && ./deploy.sh

# Tail logs:
tail -f /var/log/isp-saas/*.log

# Restart everything:
systemctl restart isp-saas-{api,web,horizon}.service

# Run an artisan command:
sudo -u isp-saas php /srv/isp-saas/backend/artisan tinker
```
