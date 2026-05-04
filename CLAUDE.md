# Claude Code Prompt — ISP & Utility Collection SaaS Platform

> **How to use this file:** Open Claude Code in your project folder, then paste the entire content of this file as your first message. Claude Code will read it and start building. You can also save it as `CLAUDE.md` in your project root and Claude Code will read it automatically every session.

---

## PROJECT OVERVIEW

You are helping me build a **multi-tenant SaaS platform** for ISPs, electricity providers, satellite TV companies, generator subscriptions, and other utility service providers. The platform's main differentiator is a **field collector module** with a mobile app — collectors physically visit customers to collect cash payments, and when they mark an invoice as "Paid", the system automatically sends a PDF receipt via WhatsApp/SMS to the customer and reactivates their service via RADIUS if it was suspended.

**Target market:** Lebanon, Middle East, North Africa, South Asia, Sub-Saharan Africa — regions where door-to-door cash collection is still dominant.

**Key competitors to beat:** Splynx, Sonar, Freeside, daloRADIUS, WISPGate. We win on: collector UX, WhatsApp-first communication, dual-currency (USD+LBP), Arabic support, and offline collector app.

---

## TECH STACK (MANDATORY — DO NOT SUBSTITUTE WITHOUT ASKING)

### Backend
- **Framework:** Laravel 11 (PHP 8.3+)
- **Multi-tenancy:** `stancl/tenancy` package (single DB with `tenant_id` column on all tables)
- **Database:** PostgreSQL 16
- **Cache & Queues:** Redis 7 + Laravel Horizon
- **Auth:** Laravel Sanctum (API tokens) + Spatie Permission package for RBAC
- **API:** RESTful JSON, versioned (`/api/v1/...`)
- **Real-time:** Laravel Reverb (WebSockets) for live collector tracking
- **Storage:** S3-compatible (Cloudflare R2 to start, AWS S3 later)
- **PDF:** Spatie/laravel-pdf or DomPDF
- **Excel:** Maatwebsite/Excel

### Frontend (Web Admin Panel)
- **Framework:** Next.js 15 with App Router
- **Language:** TypeScript (strict mode)
- **Styling:** TailwindCSS + shadcn/ui components
- **State:** Zustand for client state, TanStack Query for server state
- **Forms:** React Hook Form + Zod validation
- **Tables:** TanStack Table
- **Charts:** Recharts
- **Maps:** Mapbox GL JS (cheaper than Google Maps for our scale) with OpenStreetMap tiles
- **i18n:** next-intl (Arabic RTL, English, French)
- **Icons:** lucide-react

### Mobile (Collector App + Customer App)
- **Framework:** Flutter 3.x (Dart)
- **State:** Riverpod
- **Local DB:** Drift (offline-first)
- **HTTP:** Dio with interceptors
- **Maps:** flutter_map (OSM) + Mapbox SDK option
- **Background sync:** Workmanager
- **Push notifications:** Firebase Cloud Messaging
- **Camera/photos:** image_picker + image_cropper
- **Signature:** signature package
- **Localization:** Arabic, English, French (RTL support critical)

### DevOps
- **Containers:** Docker + docker-compose for local dev
- **CI/CD:** GitHub Actions
- **Hosting (start):** Hetzner Cloud (Ubuntu 22.04 VPS)
- **Hosting (scale):** AWS ECS + RDS + ElastiCache
- **Reverse proxy:** Nginx
- **SSL:** Let's Encrypt via Certbot
- **Monitoring:** Sentry + Grafana + Uptime Kuma
- **Logs:** Laravel Telescope (dev) + Logtail (prod)

### Third-party services
- **WhatsApp:** Meta WhatsApp Business API via 360dialog or Twilio
- **SMS:** Twilio + local Lebanese gateways (fallback)
- **Payments:** Stripe (international) + Whish/Areeba/OMT (Lebanon-specific, integrate later)
- **RADIUS:** FreeRADIUS with `rlm_rest` module calling our Laravel API

---

## REPOSITORY STRUCTURE

Create a **monorepo** with this exact structure:

```
isp-saas-platform/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Models/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   ├── Requests/
│   │   │   ├── Resources/
│   │   │   └── Middleware/
│   │   ├── Services/           # Business logic
│   │   ├── Jobs/               # Queue jobs
│   │   ├── Events/
│   │   ├── Listeners/
│   │   ├── Policies/
│   │   └── Traits/
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── factories/
│   ├── routes/
│   │   ├── api.php
│   │   └── tenant.php
│   ├── tests/
│   └── docker/
├── web-admin/                  # Next.js admin panel
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── locales/                # ar, en, fr
│   └── public/
├── mobile-collector/           # Flutter collector app
│   └── lib/
│       ├── core/
│       ├── features/
│       │   ├── auth/
│       │   ├── customers/
│       │   ├── payments/
│       │   ├── invoices/
│       │   └── sync/
│       └── shared/
├── mobile-customer/            # Flutter customer app (Phase 3)
├── docs/                       # Project documentation
├── docker-compose.yml          # Local dev environment
├── .github/workflows/          # CI/CD
└── README.md
```

---

## DATABASE SCHEMA (CORE TABLES)

Build these migrations in this order. All tables (except `tenants`, `users` super-admin) must have `tenant_id` foreign key + index.

### 1. Tenants & Users
```
tenants
  - id (uuid)
  - name (company name)
  - slug (unique, used for subdomain)
  - domain (custom domain optional)
  - logo_url
  - primary_color
  - currency_primary (USD)
  - currency_secondary (LBP, nullable)
  - exchange_rate (decimal 12,4, nullable)
  - timezone (default Asia/Beirut)
  - locale (ar, en, fr)
  - plan (starter, growth, pro, enterprise)
  - status (active, suspended, trial)
  - trial_ends_at, subscription_ends_at
  - settings (jsonb — flexible config)
  - created_at, updated_at, deleted_at

users
  - id, tenant_id (nullable for super-admin), name, email, phone
  - password (hashed), email_verified_at
  - locale, timezone
  - is_active, last_login_at, last_login_ip
  - 2fa_secret, 2fa_enabled
  - created_at, updated_at

roles (Spatie)
permissions (Spatie)
model_has_roles, model_has_permissions, role_has_permissions
```

### 2. Service Categories (Dynamic)
```
service_categories
  - id, tenant_id
  - name (Internet, Electricity, Satellite, Generator, Water, IPTV)
  - icon, color
  - custom_fields (jsonb — array of field definitions)
  - is_active
  - sort_order

# Example custom_fields for "Electricity":
# [{"key":"meter_number","type":"string","required":true,"label_ar":"رقم العداد"},
#  {"key":"last_reading","type":"number","required":false}]
```

### 3. Customers
```
customers
  - id (uuid), tenant_id, code (auto, e.g. C-00001)
  - service_category_id
  - first_name, last_name, full_name (computed)
  - national_id, passport
  - phone_primary, phone_secondary, whatsapp_phone, email
  - country, city, region, district, neighborhood
  - address_line, building, floor, apartment
  - latitude, longitude (decimal 10,7)
  - location_pin_set_at, location_pin_set_by
  - status (active, suspended, terminated, dormant, prospect)
  - balance_due (decimal 12,2)
  - credit_limit
  - service_started_at, service_ended_at
  - custom_fields (jsonb — values for service_category custom_fields)
  - tags (jsonb array)
  - notes
  - created_by, assigned_to (user_id)
  - created_at, updated_at, deleted_at

customer_documents
  - id, customer_id, type (id_copy, contract, photo_meter, photo_router, other)
  - file_path, file_size, mime_type
  - uploaded_by, uploaded_at

customer_contacts
  - id, customer_id, name, phone, relation, is_primary
```

### 4. Packages / Plans
```
packages
  - id, tenant_id, service_category_id
  - name, code, description
  - billing_type (recurring, prepaid, postpaid, usage_based)
  - billing_period (monthly, quarterly, annual, custom_days)
  - price (decimal 12,2)
  - currency
  - setup_fee, deposit
  - tax_rate
  - speed_down_mbps, speed_up_mbps  -- for internet
  - data_quota_gb -- for internet (null = unlimited)
  - amperage -- for generator (5, 10, 15)
  - kwh_included -- for electricity
  - radius_group_name -- maps to FreeRADIUS group
  - is_active
  - sort_order

customer_subscriptions
  - id, tenant_id, customer_id, package_id
  - status (active, suspended, cancelled, pending)
  - started_at, current_period_start, current_period_end
  - auto_renew (bool)
  - price_override (nullable)
  - notes
  - created_at, updated_at
```

### 5. Invoicing & Payments
```
invoices
  - id (uuid), tenant_id, customer_id, subscription_id
  - number (auto, e.g. INV-2026-00001)
  - issued_at, due_at
  - period_start, period_end
  - subtotal, tax_amount, discount_amount, total
  - currency
  - status (draft, open, paid, partial, overdue, cancelled, void)
  - paid_amount, balance_due
  - paid_at
  - notes
  - pdf_path
  - created_at, updated_at

invoice_items
  - id, invoice_id, package_id (nullable)
  - description, quantity, unit_price, tax_rate, total
  - meta (jsonb — usage details, meter readings, etc.)

payments
  - id (uuid), tenant_id, customer_id, invoice_id (nullable)
  - amount, currency
  - method (cash, card, bank_transfer, whish, omt, areeba, stripe, other)
  - reference_number
  - status (pending, completed, failed, refunded)
  - collected_by_user_id (collector or accountant)
  - collected_at
  - latitude, longitude (where payment was recorded)
  - photo_path (proof)
  - signature_path
  - notes, voice_note_path
  - receipt_sent_at, receipt_channels (jsonb: ["whatsapp","sms"])
  - device_id (which mobile device recorded this)
  - is_synced (for offline mode)
  - created_at, updated_at

cash_handovers
  - id, tenant_id, from_user_id (collector), to_user_id (supervisor)
  - amount, currency
  - status (pending, confirmed, disputed)
  - photo_path, signature_path
  - notes
  - confirmed_at, created_at
```

### 6. Collector Module
```
collector_assignments
  - id, tenant_id, collector_user_id, invoice_id
  - assigned_by, assigned_at
  - status (pending, in_progress, completed, failed, reassigned)
  - completed_at
  - failure_reason (customer_not_home, refused, partial_payment, dispute, other)
  - voice_note_path
  - priority (1-5)
  - zone, route_order (for optimization)

collector_routes
  - id, tenant_id, collector_user_id
  - date
  - planned_invoices (jsonb array)
  - completed_invoices (jsonb array)
  - total_collected
  - started_at, ended_at
  - distance_km, gps_track (jsonb — location pings)

collector_zones
  - id, tenant_id, name, polygon (geojson)
  - default_collector_id
```

### 7. RADIUS Integration
```
radius_users
  - id, tenant_id, customer_id, subscription_id
  - username (unique per tenant)
  - password (encrypted, used for PAP/CHAP)
  - mac_address
  - ip_assigned
  - radius_group
  - status (active, suspended, throttled, terminated)
  - data_used_mb_current_period
  - last_seen_at
  - last_login_at, last_login_ip, last_login_nas

radius_sessions
  - id, radius_user_id, tenant_id
  - session_id (Acct-Unique-Session-ID)
  - nas_ip, nas_port
  - framed_ip
  - started_at, ended_at, duration_seconds
  - bytes_in, bytes_out
  - terminate_cause

nas_devices
  - id, tenant_id, name, ip_address, secret (encrypted)
  - type (mikrotik, cisco, huawei, other)
  - location, notes
  - is_active
```

### 8. Communications & Notifications
```
message_templates
  - id, tenant_id, key (invoice_created, payment_received, suspension_warning, etc.)
  - channel (whatsapp, sms, email)
  - locale (ar, en, fr)
  - subject (for email)
  - body (with {{variables}})
  - is_active

messages_log
  - id, tenant_id, customer_id (nullable), user_id (nullable)
  - channel, template_key
  - to_address (phone or email)
  - status (queued, sent, delivered, read, failed)
  - provider (twilio, 360dialog, whatsapp_meta)
  - provider_message_id
  - cost
  - error
  - sent_at, delivered_at, read_at

notification_settings
  - tenant_id (PK), customer_id (nullable for tenant-wide)
  - whatsapp_enabled, sms_enabled, email_enabled
  - send_invoice_on_create, send_reminder_days_before (jsonb [5,2])
  - send_overdue_after_days (jsonb [1,3,7])
  - send_receipt_on_payment
```

### 9. Auxiliary
```
audit_logs (everything important)
  - id, tenant_id, user_id, action, model_type, model_id
  - old_values, new_values (jsonb)
  - ip_address, user_agent
  - created_at

tickets (support / installation)
  - id, tenant_id, customer_id, type (install, repair, disconnect, support)
  - status, priority, assigned_to_user_id
  - title, description
  - scheduled_at, completed_at
  - check_in_lat, check_in_lng, check_in_at
  - photos (jsonb array)
  - signature_path
  - materials_used (jsonb)
  - created_at, updated_at
```

---

## CRITICAL FEATURES & BUSINESS RULES

### Auto-Receipt Flow (Collector Marks Paid)
When `POST /api/v1/payments` is hit from the collector mobile app:

1. Validate: GPS distance from customer location < 200m (configurable per tenant)
2. Create `payment` record in DB (status: completed)
3. Update `invoice.paid_amount`, recompute `invoice.balance_due`, set `invoice.status` if fully paid
4. Update `customer.balance_due`
5. Dispatch async job `GenerateAndSendReceiptJob`:
   - Generate PDF receipt (Spatie/laravel-pdf) with QR code linking to public verification URL
   - Upload PDF to S3
   - Send via WhatsApp (primary), SMS (fallback if no WhatsApp), Email (if available)
   - Log all sends in `messages_log`
6. Dispatch async job `ReactivateServiceJob`:
   - If customer has active subscription with RADIUS, set `radius_user.status = active`
   - Send `Disconnect-Request` via CoA to NAS to force reauth (so customer reconnects with new policy immediately)
7. Trigger event `PaymentReceived` for analytics, dashboards

### RADIUS REST Endpoints (called BY FreeRADIUS)
These endpoints are public but protected by IP whitelist + secret key:

```
POST /api/radius/authorize
  Body: {username, password, nas_ip, mac_address}
  Returns: {control:{Auth-Type:"Accept"}, reply:{Mikrotik-Rate-Limit:"50M/50M"}} | 401

POST /api/radius/accounting
  Body: {acct-status-type, username, session-id, bytes-in, bytes-out, ...}
  Returns: 200 OK (just log)

POST /api/radius/post-auth
  Body: {username, reply:{...}}
  Returns: 200 OK (log success/failure)
```

### RADIUS Outbound (CoA / Disconnect)
When suspending/changing speed, send Change-of-Authorization to NAS:
```
Service: App\Services\RadiusCoAService
  - sendDisconnect($radiusUser): forces logoff
  - sendSpeedChange($radiusUser, $newGroup): updates limits without disconnect
  - sendSuspension($radiusUser): sets walled-garden VLAN
```

### Multi-Tenancy Rules
- Every Eloquent model uses `BelongsToTenant` trait that auto-scopes queries to current tenant
- `TenantMiddleware` resolves tenant from subdomain OR `X-Tenant-ID` header for API
- Super-admin routes bypass tenancy and live under `/super-admin/*`
- Database queries MUST be scoped — write a global scope, never trust application code

### RBAC Permissions (Seed These)
Roles per tenant:
- `tenant_owner` — all permissions
- `tenant_admin` — all except billing/subscription management
- `manager` — manage customers, packages, invoices, view reports
- `accountant` — invoices, payments, reports, no customer edit
- `support` — view customers, create tickets, send messages
- `technician` — own tickets only, mobile access
- `collector` — assigned invoices only, mobile access
- `customer` — self-service portal only

Permissions (granular):
```
customers.view, customers.create, customers.edit, customers.delete
packages.view, packages.manage
invoices.view, invoices.create, invoices.edit, invoices.cancel, invoices.discount
payments.view, payments.record, payments.refund
collectors.view, collectors.assign, collectors.reassign
reports.view, reports.export
users.manage, roles.manage
radius.manage, nas.manage
settings.manage, billing.manage
```

### Offline Mode (Mobile)
- Flutter app uses Drift (SQLite) as local DB
- On login, sync all assigned invoices, customer data, packages
- Recording payment offline → store in local DB with `is_synced: false`
- Background worker (Workmanager) attempts sync every 5 min when online
- Conflict resolution: server wins, but log conflict for manual review
- Show clear offline indicator in UI

### Dual Currency Logic
- Each tenant has `currency_primary` (always required) and optional `currency_secondary`
- `exchange_rate` updated daily (manual or API)
- Invoices are stored in primary currency only
- UI displays both: e.g. "$50.00 (≈ 4,475,000 LBP)"
- Payments can be received in either currency, recorded in primary using locked rate

### Internationalization
- Backend: store `locale` per user, send messages/PDFs in their locale
- Frontend: `next-intl` with `ar`, `en`, `fr` locales, RTL layout for Arabic
- Mobile: Flutter `intl` package, RTL support
- Message templates: separate row per locale per template

---

## API DESIGN PRINCIPLES

- All endpoints under `/api/v1/`
- JSON only, RESTful
- Use Laravel Resources for responses
- Use Form Requests for validation
- Pagination: `?page=1&per_page=25` returning `{data:[], meta:{...}, links:{...}}`
- Filtering: `?filter[status]=active&filter[city]=Tripoli`
- Sorting: `?sort=-created_at`
- Search: `?search=ahmad`
- Always return ISO 8601 timestamps with timezone
- Errors: standardized JSON `{message, errors:{}, code}`
- Rate limiting: 60 req/min for tenant API, 1000 req/min for RADIUS API

### Key endpoints to build (Phase 1)
```
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me

GET    /customers
POST   /customers
GET    /customers/{id}
PATCH  /customers/{id}
DELETE /customers/{id}
GET    /customers/{id}/invoices
GET    /customers/{id}/payments

GET    /packages
POST   /packages
PATCH  /packages/{id}

GET    /invoices
POST   /invoices
POST   /invoices/generate-bulk  -- run monthly billing
GET    /invoices/{id}
GET    /invoices/{id}/pdf

GET    /payments
POST   /payments  -- collector records payment, triggers receipt
GET    /payments/{id}/receipt-pdf

# Collector module
GET    /collector/my-assignments  -- today's list
GET    /collector/my-route        -- optimized order
POST   /collector/check-in
POST   /collector/check-out
POST   /collector/handover-cash

# Manager assigning
POST   /collector-assignments
POST   /collector-assignments/bulk-assign
PATCH  /collector-assignments/{id}/reassign

# RADIUS (public, IP-whitelisted)
POST   /radius/authorize
POST   /radius/accounting
POST   /radius/post-auth

# RADIUS management (admin)
GET    /radius-users
POST   /radius-users/{id}/suspend
POST   /radius-users/{id}/reactivate
POST   /radius-users/{id}/change-speed
GET    /radius-users/{id}/sessions

# Reports
GET    /reports/dashboard
GET    /reports/aging
GET    /reports/collector-performance
GET    /reports/revenue
```

---

## DEVELOPMENT WORKFLOW

### Phase 1 Goal (MVP — what you build first)
1. Set up Laravel + Postgres + Redis + Docker
2. Auth (Sanctum) + super-admin tenant creation
3. Core models with multi-tenancy: Tenant, User, ServiceCategory, Customer, Package, Subscription, Invoice, Payment
4. Basic CRUD APIs for above
5. Invoice PDF generation
6. Payment recording endpoint with auto-receipt job (WhatsApp via 360dialog sandbox + SMS via Twilio)
7. Next.js admin dashboard: login, customer list, customer detail, invoice list, package management, basic dashboard
8. Flutter collector app: login, today's assignments, customer detail, record cash payment, generate receipt, offline mode
9. Seed data + factories for testing

### Coding Standards
- **PHP/Laravel:** PSR-12, strict types, type-hint everything, Larastan level 6
- **TypeScript:** strict mode, no `any`, prefer interfaces over types for objects
- **Dart:** follow effective_dart, prefer_const everywhere, use freezed for models
- **Tests:** PHPUnit/Pest for backend (aim 60% coverage), Jest for frontend, flutter_test for mobile
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branching:** `main` (production), `develop` (staging), `feature/*`, `fix/*`
- **PRs:** required for everything to `main` and `develop`
- **Linting:** Pint (Laravel), ESLint+Prettier (TS), dart format (Flutter) — run on pre-commit hook

### Documentation Required
- `README.md` at repo root: setup, run, deploy
- `docs/api.md` or use Scribe/Swagger for auto-generated API docs
- `docs/database.md`: ERD + table descriptions
- `docs/deployment.md`: prod deploy guide
- `docs/radius-setup.md`: how ISP integrates their FreeRADIUS

---

## SECURITY REQUIREMENTS (NON-NEGOTIABLE)

- Passwords: bcrypt (Laravel default), min 8 chars, complexity rules
- All API: HTTPS only in prod
- 2FA available for admin users (TOTP via Google Authenticator)
- Tenant data isolation: enforce at DB query level (global scope) + integration tests prove leakage impossible
- RADIUS endpoints: IP whitelist + shared secret in header
- Audit log for: login, payment, invoice cancel, user role change, customer delete, RADIUS suspend/reactivate
- Encrypted-at-rest: NAS secrets, RADIUS passwords (separate from user passwords), API keys
- CORS: strict per-tenant domain whitelist
- Rate limiting on auth endpoints (5 attempts → 15 min lockout)
- SQL injection: Eloquent only, never raw queries with user input
- XSS: escape all output, set CSP headers
- File uploads: validate mime + size + virus scan (ClamAV)

---

## INSTRUCTIONS FOR YOU (CLAUDE CODE)

1. **Always read this file first** at the start of every session.
2. **Check what already exists** before creating new files — list files first, read them, then write.
3. **Don't make architectural decisions alone.** If something major is unclear or you want to deviate from this plan, ASK ME first.
4. **Build in small, working increments.** After each feature: run tests, run linter, commit with a clear message.
5. **Write tests as you go.** Don't leave testing for "later".
6. **Keep migrations atomic and reversible** — every `up()` has a working `down()`.
7. **Comment business logic** that isn't obvious from the code (e.g., why dual currency works the way it does).
8. **Use English for code, comments, and commits.** Localized strings live only in i18n files.
9. **Never commit secrets** — use `.env`, provide `.env.example`.
10. **When in doubt about a Lebanese/regional specific (Whish, OMT, electricity amperage, LBP rounding), ASK me** — I have local context.

### Things I want you to ASK before doing
- Adding a new package/dependency (especially heavyweight ones)
- Creating a new microservice or splitting the monolith
- Choosing between two architectural approaches
- Deleting any data
- Running destructive migrations on existing data
- Changing the tech stack from what's specified above

### Things you can do without asking
- Create new files inside the agreed structure
- Refactor for clarity (with tests)
- Add type hints, fix linter warnings
- Write tests
- Update documentation
- Format code

---

## FIRST TASKS (Start Here)

When I say "begin", do these in order:

1. Initialize the monorepo: `git init`, create folder structure, `.gitignore`, `README.md`, `docker-compose.yml` with services (postgres, redis, mailhog, minio for local S3)
2. Set up Laravel backend in `backend/` with Sail or custom Docker
3. Install required packages: `stancl/tenancy`, `spatie/laravel-permission`, `laravel/sanctum`, `spatie/laravel-pdf`, `simple-qrcode/simple-qrcode`, `spatie/laravel-activitylog`
4. Create migrations for: `tenants`, `users`, `roles`, `permissions`, `service_categories`, `customers`, `packages`, `customer_subscriptions`, `invoices`, `invoice_items`, `payments`
5. Create models with relationships and `BelongsToTenant` trait
6. Create factories + a seeder that produces: 1 super-admin, 2 demo tenants ("DemoISP", "DemoElectric"), each with 5 users, 3 service categories, 50 customers, 5 packages, 100 invoices, 60 payments
7. Build auth API: login, logout, refresh, me
8. Build CustomerController with full CRUD + filters/search/pagination
9. Write Pest tests for: auth flow, customer CRUD with tenant isolation (try to access another tenant's data → 404)
10. Show me what you built, list the routes, and STOP. I'll review and then we move to invoices+payments.

---

## ENVIRONMENT VARIABLES (.env.example)

```
# App
APP_NAME="ISP SaaS"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://localhost:8000
APP_TIMEZONE=Asia/Beirut

# DB
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_PORT=5432
DB_DATABASE=isp_saas
DB_USERNAME=postgres
DB_PASSWORD=secret

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Queue
QUEUE_CONNECTION=redis
HORIZON_PREFIX=isp_saas

# Storage
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=auto
AWS_BUCKET=isp-saas-dev
AWS_ENDPOINT=  # R2 endpoint
AWS_USE_PATH_STYLE_ENDPOINT=true

# Mail
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025

# WhatsApp (360dialog)
WHATSAPP_PROVIDER=360dialog
WHATSAPP_API_KEY=
WHATSAPP_API_URL=https://waba.360dialog.io

# SMS (Twilio)
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_FROM=

# RADIUS
RADIUS_API_SECRET=  # shared with FreeRADIUS rlm_rest config
RADIUS_ALLOWED_IPS=127.0.0.1,10.0.0.0/8

# Stripe (later)
STRIPE_KEY=
STRIPE_SECRET=
STRIPE_WEBHOOK_SECRET=
```

---

## REFERENCE DOCUMENTS

The full project plan is in `docs/project-plan.md` (the previous markdown document). Refer to it for business context, market analysis, and feature priorities.

---

**End of prompt. When ready, say "begin" and I will start with Task 1 above.**
