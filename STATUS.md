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

### Session 2026-05-04 (overnight security hardening pass)
**Big push — all 20 prioritized findings from the security audit applied across 4 commits.**

Backend security:
- **RADIUS cross-tenant auth (CRITICAL):** `tenant_id` resolution is now mandatory — derived from explicit body field OR from the NAS source IP via `nas_devices` lookup. `hash_equals` replaces `!==` for password comparison. New tests prove same-username-across-tenants no longer cross-authenticates.
- **Login/logout/failed audit (CRITICAL):** `LogAuthenticationEvents` listener registered in `AppServiceProvider` writes `user.login`, `user.logout`, `user.login_failed` rows. Tested.
- **Per-action permission gates (HIGH):** `Customer/Invoice/Payment/User/RadiusUser` controllers now `abort_unless($user->can(...))`. `InvoiceController::destroy` audits `invoice.cancelled`. `PaymentController::refund` audits `payment.refunded`. `RadiusUserController::changeSpeed` audits `radius.speed_changed`. `UserFactory::withRole()` helper auto-seeds Spatie roles for tests.
- **Cross-tenant `users.id` foreign keys (HIGH):** `Rule::exists` scoped by current tenant in `HandoverRequest`, `TicketController`, `CollectorZoneController`. Pre-fix attackers could reference users from other tenants.
- **Tenant integration secrets encrypted (HIGH):** `whatsapp.api_key`, `sms.token`, `radius.shared_secret` now AES-encrypted via `Crypt::encryptString` in `tenants.settings` JSONB; the audit log records *which keys* changed but not their values. Helper `SettingsController::readIntegrationSecret` for runtime decryption.
- **Rate limiting (HIGH):** `throttle:60,1` on `/v1` group, `throttle:1000,1` on RADIUS group.
- **Public receipt URLs signed (HIGH):** `URL::temporarySignedRoute` with default 30-day TTL (configurable via `tenant.settings.receipt_link_ttl_days`). Unsigned hits return 403.
- **2FA disable re-auth (HIGH):** Requires current password OR current TOTP code. Frontend two-factor-panel.tsx has an inline form for re-auth instead of a bare confirm() dialog.
- **Invoice number / customer code race (HIGH):** `App\Support\UniqueRetry::run` retries up to 5 times on `UniqueConstraintViolationException` with random microsecond backoff. Wraps creates in `CustomerController::store`, `InvoiceController::store`, `InvoiceGenerator`.
- **Payment idempotency (HIGH):** Migration adds nullable `client_uuid` + partial unique index `(tenant_id, client_uuid) WHERE client_uuid IS NOT NULL`. PaymentController detects duplicate UUIDs and returns the original payment instead of creating a duplicate. Test verifies double POST returns same payment ID.
- **Dual-currency payment conversion (CRITICAL):** Migration adds `amount_received` / `currency_received` / `exchange_rate_used` columns; `PaymentRecorder::normalizeCurrency` converts received-currency to invoice-currency at the locked tenant rate. Pre-fix a 4,475,000 LBP cash payment against a $50 USD invoice instantly marked it paid with `paid_amount = 4_475_050`; post-fix it correctly credits $50.00 and snapshots the rate so a later FX update doesn't retroactively alter accounting.
- **Job `failed()` handlers (MEDIUM):** All four jobs (`SendPaymentReceiptJob`, `SendInvoiceReminderJob`, `ReactivateServiceJob`, `RefreshExchangeRatesJob`) now flip stuck `messages_log` rows from `queued` → `failed` after `$tries` exhausts and log at ERROR.
- **CoaService driver gate (MEDIUM):** Config `services.radius.coa_driver = null|radclient`. Null driver logs at WARNING (was INFO) and returns false so staging fails loud instead of silently lying about RADIUS state.
- **Tenant timezone in cron (MEDIUM):** `SendDueRemindersCommand` resolves `today()` and quiet-hours per tenant timezone instead of APP_TIMEZONE.

Web security:
- **2FA password leak (CRITICAL):** Pre-fix the login Server Action returned `{email, password, ...}` in its state during a 2FA challenge — visible in network tab. Post-fix credentials are stashed in a short-lived (300s) AES-256-GCM-encrypted httpOnly cookie scoped to `/login` (`lib/two-factor-challenge.ts`). The browser never sees the password again. Production needs `TWO_FACTOR_CHALLENGE_KEY` env var (32+ chars) — dev fallback is `NODE_ENV`-derived and refuses to run when `AUTH_COOKIE_SECURE=true`.
- **Super-admin / settings Server Actions gated (HIGH):** `actionRequireSuperAdmin` / `actionRequireRole` helpers in `lib/auth.ts`. Applied to `super-admin/tenants/[id]/actions.ts`, `super-admin/tenants/new/actions.ts`, `super-admin/plans/actions.ts`, `super-admin/settings/actions.ts`, `(dashboard)/settings/users/actions.ts`, `(dashboard)/settings/roles/actions.ts`. Layout-only gates were bypassable by direct POST to the action endpoint ID.
- **Auth-gate internal API routes (HIGH):** `api/customer-search` and `api/collector-live` reject 401 when no cookie present instead of returning empty arrays. `api/customer-search?q=` capped at 200 chars.
- **Route handler validation (MEDIUM):** `api/invoices/[id]/pdf` validates UUID shape; `api/reports/export?type=` allowlisted to known report types.
- **QR SVG injection (MEDIUM):** Replaced `dangerouslySetInnerHTML={{ __html: qrSvg }}` with `<img src="data:image/svg+xml;base64,...">` so a compromised upstream SVG can't run inline `<script>`.

Cleanup:
- Removed unused composer deps: `stancl/tenancy`, `spatie/laravel-pdf`, `maatwebsite/excel`, `simplesoftwareio/simple-qrcode`, `laravel/horizon`, `laravel/reverb`.
- Removed unused npm deps: `axios`, `next-intl` (custom `lib/i18n.ts` is what's actually used). `shadcn` kept — needed for the `shadcn/tailwind.css` import in globals.css.
- `pnpm.overrides` clamps `postcss >= 8.5.10` for GHSA-qx2v-qp2m-jg93.
- `lucide-react@1.14.0` verified as actual current latest (published 2026-04-29) — the dep audit's claim it was a wrong-major was incorrect.

**Test results: 124 passing, 1 todo.** All four commits pushed to `main` on GitHub.

### Session 2026-05-04 (earlier)
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
- Initialized git, pushed to https://github.com/mmdelhajj/collector-SaaS, set up SSH keys for future pushes.

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
