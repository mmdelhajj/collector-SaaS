# Project Status — ISP & Utility Collection SaaS

> **Purpose of this file:** Claude Code reads this at the start of each session to know exactly where we left off. Update it at the end of every coding session. Keep it short and factual — no fluff.

---

## Current Phase
**Phase 1 — MVP** (mostly complete on backend + web; mobile is the laggard)

## Last Updated
_Date: 2026-05-04_

---

## ✅ Completed

<!-- List finished features. Format: feature name + date + commit hash. Most recent at top. -->

### Backend (Laravel 11 + PostgreSQL 16 + Redis 7)
- Multi-tenancy via custom `BelongsToTenant` trait + `TenantContext` (not stancl/tenancy — single DB, tenant_id column, global scope).
- 33 migrations covering: tenants, users, service_categories, customers, packages, customer_subscriptions, invoices, invoice_items, payments, permission tables, message_templates, messages_log, collector_assignments, collector_routes, collector_zones, cash_handovers, nas_devices, radius_users, radius_sessions, tickets, audit_logs, plans, platform_settings, two-factor, avatars.
- 22 models, 28 API controllers (V1 + Radius gateway + SuperAdmin).
- Auth: Sanctum tokens, login/logout/refresh/me, signup flow, two-factor.
- RBAC: Spatie permission package, roles seeded (tenant_owner, tenant_admin, manager, accountant, support, technician, collector).
- Customer/Package/Invoice/Payment CRUD with tenant isolation tests.
- Collector module: assignments, routes, zones, live tracking, period reports, cash handovers.
- RADIUS gateway endpoints (authorize/accounting/post-auth) + admin (suspend/reactivate/sessions) + auto-reactivate-on-payment job.
- Notifications: WhatsApp/SMS/email drivers, multi-channel routing, payment receipts, message templates.
- Reports: dashboard, aging, collector performance, revenue.
- Audit logging across all sensitive actions.
- Exchange rate auto-refresh job (open.er-api.com) + manual override.
- 22 Pest test files (auth, RBAC, tenant isolation across customers/invoices/packages/payments, RADIUS, collector, notifications, reports).

### Web Admin (Next.js 16 + React 19 + TypeScript + Tailwind v4)
- Auth pages: login, signup.
- Dashboard with live metrics + recent activity feed.
- Customers (list + detail with invoices/payments/outstanding panel).
- Invoices (list + bulk billing + PDF export + filters).
- Payments, Packages, Tickets, Messages, RADIUS users, Reports.
- Collectors (list + per-collector view + live map + cash handovers).
- My-route flow for collectors (record payment with GPS + signature + photo).
- Settings: workspace, users, billing, payments, notifications, templates, currency, security, audit, integrations, zones, roles.
- Super-admin: tenant management (list/detail/new), plans, platform settings, profile.
- i18n (en, ar, fr) with RTL support; locale switcher.
- Production build verified: 43 routes, 33s build time, 14-90ms TTFB on warm pages.

### DevOps
- `docker-compose.yml`: postgres 16, redis 7, mailpit, minio (with auto bucket init) — all healthy.
- Seed data: 7 tenants, 17 users, 50+ customers per demo tenant, packages, invoices, payments.

---

## 🚧 In Progress

<!-- What's being worked on right now. Should usually be 1-2 items max. -->

- _Nothing actively in flight._

---

## ⏭️ Up Next (Priority Order)

1. **Mobile collector app (Flutter)** — currently only a scaffold (5 dart files: login, assignments list, record payment screen). Needs: Drift offline DB schema + sync, Workmanager background sync, camera/signature/GPS integration, route map with flutter_map, i18n.
2. **Re-initialize git** — repo lost its `.git` directory. Worth `git init` + initial commit before more work lands.
3. **Production deployment** — Hetzner VPS not provisioned. Caddy + Cloudflare config referenced in env comments but not deployed.
4. **Telescope/Horizon** dashboards (queue + log monitoring) — not yet wired into routes.
5. **Customer self-service portal** (Phase 3 in the original plan) — not started.

---

## 🐛 Known Issues / Tech Debt

- `web-admin/.env.local` has `AUTH_COOKIE_SECURE=false` for local HTTP testing — **flip back to `true` before deploying** (it's behind Cloudflare+Caddy in prod, cookie must be Secure-only).
- `web-admin/package.json` dev script does `rm -rf .next/dev && next dev` — wipes Turbopack cache every boot, causing 5-6s cold compile. The `dev:keep-cache` alternate skips this. The wipe + `Cache-Control: no-store` headers in `next.config.ts` are duplicate defenses against stale-chunk hydration mismatches; keeping both for now until we know the headers alone are enough.
- Mobile collector module is barely started while backend APIs for it are fully built — there's a coordination cost when both move.

---

## ❓ Open Questions for the User

- _None._

---

## 🔑 Important Decisions Made

- **Multi-tenancy:** chose custom `BelongsToTenant` trait + `TenantContext` instead of `stancl/tenancy` (deviation from CLAUDE.md). Single shared DB with tenant_id column + global scope; super-admin bypasses scope.
- **Currency audit trail (2026-05-04):** when `currency_primary` or `currency_secondary` changes, the existing `exchange_rate` is cleared (it was for the old pair, not comparable) and a `tenant.currency_changed` audit event is recorded separately from `tenant.exchange_rate_updated`. This prevents the misleading "rate flipped from 89500 to 0.85" entries that confused the audit log when admins changed currency settings.

---

## 📦 Packages Added (Beyond Initial List)

| Package | Purpose | Added On |
|---------|---------|----------|
| @base-ui/react | Headless UI primitives (alongside shadcn) | early |
| leaflet + react-leaflet | Collector live map (chosen over Mapbox for now) | early |
| sonner | Toast notifications | early |

---

## 🧪 Test Coverage

| Module | Coverage % | Last Run |
|--------|-----------|----------|
| Backend (Pest) | 22 feature files covering auth/RBAC/customers/invoices/packages/payments/collector/RADIUS/notifications/reports — % not measured | recent |
| Web (Jest) | not set up | – |
| Mobile (flutter_test) | not set up | – |

---

## 🌐 Deployment Status

| Environment | URL | Last Deploy | Status |
|-------------|-----|-------------|--------|
| Local Dev (backend) | http://127.0.0.1:8000 | 2026-05-04 | ✅ Running (php artisan serve) |
| Local Dev (web prod build) | http://127.0.0.1:3000 / http://139.162.182.87:3000 | 2026-05-04 | ✅ Running (npm start) |
| Local Dev (mailpit) | http://139.162.182.87:8025 | – | ✅ |
| Local Dev (minio console) | http://139.162.182.87:9001 | – | ✅ |
| Staging | – | – | – |
| Production | – | – | – |

---

## 📝 Session Notes

### Session 2026-05-04
- Confirmed full Phase 1 MVP backend + web are functionally complete; STATUS.md was still the empty template.
- Smoke-tested end-to-end: backend `/auth/login`, `/auth/me`, `/customers`, `/invoices`, `/reports/dashboard` all 200; web `/login`, `/dashboard` (auth guard 307), `/signup` all rendering.
- **Fixed exchange rate audit-trail bug** (`SettingsController::updateCurrency`):
  - Detects `currency_primary` / `currency_secondary` changes.
  - Clears stale `exchange_rate` + `exchange_rate_updated_at` (the old value was for a different pair and incomparable).
  - Records new `tenant.currency_changed` audit event (separate from `tenant.exchange_rate_updated`).
  - Reproduced original bug, verified fix.
  - Added dashboard activity-feed labels for both `tenant.currency_changed` and `tenant.exchange_rate_updated` (with `Coins` icon + human-readable detail line).
- **Ran production build** — 33s build, 43 routes, no errors. Public page TTFB dropped 3-5x vs dev (e.g. `/login` 65ms → 14ms). Authenticated pages 85-237ms TTFB.
- Set `AUTH_COOKIE_SECURE=false` in `web-admin/.env.local` for local HTTP testing — see Known Issues.
- Repo has no `.git` directory — flagged as up-next item.

---

## 🚦 Quick Commands Reference

```bash
# Backend
cd backend
php artisan serve --host=127.0.0.1 --port=8000   # dev server
php artisan migrate:fresh --seed                  # reset DB with seed data
php artisan horizon                               # queue worker
php artisan test                                  # run Pest tests
./vendor/bin/pint                                 # format code

# Web Admin
cd web-admin
npm run dev               # dev (wipes turbopack cache first)
npm run dev:keep-cache    # dev without wiping cache (faster reboot)
npm run build && npm start   # production build + serve
npm run lint

# Mobile Collector
cd mobile-collector
flutter run                    # debug on device/emulator
flutter test
flutter build apk --release
dart format lib/

# Docker
docker compose up -d
docker compose logs -f backend
docker compose down
```

---

## 🎯 Sprint Goals (Current 2-Week Block)

**Sprint #1 — Foundation** (✅ Complete)
- [x] Repo structure created
- [x] Local dev environment runs (Docker)
- [x] Auth working (login/logout/me)
- [x] Customer CRUD with tenant isolation
- [x] First Pest tests passing
- [x] Seed data working

**Next sprint suggestions:**
- Mobile collector: Drift schema + first sync + record payment offline.
- Git init + initial commit + GitHub repo.
- Caddy + Cloudflare deployment to Hetzner staging.

---

**Instructions for Claude Code:**
- Read this file at the start of every session.
- Update "Completed" and "In Progress" as you finish work.
- Add to "Open Questions" anything you need clarified.
- Add notes to "Session Notes" at the end of each session — what was done, any gotchas.
- Don't delete history; append to it.
