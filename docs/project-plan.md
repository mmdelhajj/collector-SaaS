# SaaS Platform — ISP, Utility & Field Collection Management

**Project planning document — full architecture, features, and roadmap**

---

## 1. Executive Summary

A multi-tenant cloud SaaS platform that allows service providers (ISPs, electricity providers, satellite TV, generator subscriptions, water companies, IPTV, etc.) to manage their entire operation: customers, packages, invoicing, payments, and most importantly — **field collectors** who physically collect cash from customers door-to-door.

**Target market:** Lebanon, Middle East, North Africa, South Asia, Sub-Saharan Africa — regions where cash collection by field agents is still the dominant payment method.

**Your competitive edge:** Existing platforms (Splynx, Sonar, Freeside, WISPGate) are strong on ISP billing but weak on the field-collector workflow. You will lead with the **collector module + WhatsApp + dual-currency + regional payment integrations**.

---

## 2. Core Architecture

### Multi-Tenancy
- Each company (tenant) gets an isolated workspace
- Per-tenant: branding (logo, colors), currency, language, tax rules, timezone
- One central database with tenant_id on every table, OR separate database per tenant for larger clients
- Recommended: single DB + tenant_id filter for first 100 clients, then move large clients to dedicated DB

### Languages
- Arabic (RTL), English, French — minimum
- Add Spanish, Urdu, Swahili later for global expansion

### Currencies
- Multi-currency native support
- Critical: dual-currency display (e.g., USD primary + LBP secondary) with daily exchange rate
- Per-invoice currency lock (invoice generated in USD stays in USD even if rate changes)

---

## 3. Core Modules

### 3.1 Service Categories (Dynamic, Not Hardcoded)
Build a flexible "Service Type" engine. Tenant admin creates categories like:
- Internet (PPPoE, fiber, wireless, hotspot)
- Satellite TV
- Electricity (kWh metered or amperes subscription)
- Generator subscription (5A, 10A, 15A — Lebanese standard)
- Water
- Cable TV / IPTV
- VoIP

Each category has custom fields (e.g., Electricity = meter number + last reading; Internet = MAC address + PPPoE login + IP).

### 3.2 Customer Management (CRM)
- Full profile: name, ID, phone, WhatsApp, email
- GPS location pin on map (critical for collectors)
- Photos: meter, router, building entrance, ID
- Family/secondary contact
- Service history & timeline
- Status: active, suspended, terminated, dormant
- Documents (contract, ID copy)
- Outstanding balance, credit limit, payment history
- Tags & custom fields
- Notes (internal team notes)

### 3.3 Packages & Plans
- Recurring (monthly/quarterly/annual)
- Prepaid & postpaid
- Usage-based (GB for internet, kWh for electricity)
- Tiered pricing
- Family bundles & combos
- Promo codes & discounts
- Prorating for mid-cycle changes
- Auto-renewal & grace periods
- Setup fees & deposits

### 3.4 Invoicing & Billing Engine
- Auto-generate invoices on schedule (1st of month, customer anniversary, custom)
- Invoice templates (per tenant, branded)
- Late fees & penalties (auto-applied)
- VAT / tax (multi-jurisdiction)
- Multi-currency invoices
- Partial payments
- Credit notes & refunds
- Bulk invoice generation
- PDF generation + email + WhatsApp send
- Recurring invoice rules

### 3.5 Collector Module ⭐ (Your Differentiator)

**Web (Manager Side):**
- Create collector users
- Assign invoices to collectors:
  - Manual selection ("give these 50 to Ahmad")
  - Auto-assign by zone/GPS clustering
  - Auto-assign by customer tag or area
- Bulk re-assignment (move from one collector to another)
- Live map showing all collectors with GPS pins
- Daily/weekly collection targets
- Commission rules (% of collection or per-invoice fee)
- Cash reconciliation dashboard

**Mobile App (Collector Side — Android first, then iOS):**
- Login with phone + PIN/biometric
- Today's assignment list (sorted by GPS proximity)
- Map view with all customers as pins
- **Route optimization** — best order to visit
- Customer detail card: name, phone, address, photo, balance, last payment
- One-tap navigation (Google Maps / Waze)
- Accept payment: cash, card (POS), QR (Whish/OMT/CashUnited), bank transfer reference
- **Offline mode** — works without internet, syncs later
- Auto-generate digital receipt
- Send receipt via WhatsApp / SMS automatically
- Photo capture (proof of payment, signature)
- Voice note (collector records reason for non-payment)
- Customer rating / status update
- Daily summary: total collected, cash on hand
- Cash hand-in workflow (deposit to supervisor with photo + signature)
- Attendance check-in/check-out with GPS

**Anti-fraud features:**
- GPS validation (collector must be near customer location to record payment)
- Duplicate payment detection
- Photo timestamp verification
- Cash reconciliation alerts (if collector's cash on hand exceeds X amount)
- Audit trail on every action

**Auto-Receipt Flow (when collector taps "PAID"):**

The moment a collector marks a customer as paid in the mobile app, the system triggers an automated chain:

1. Payment recorded with collector ID, GPS coordinates, timestamp, optional photo proof
2. Invoice status flips to "Paid", customer balance updates instantly
3. **PDF receipt auto-generated** containing:
   - Tenant logo & branding
   - Customer name, ID, address
   - Invoice number & billing period
   - Amount paid in dual currency (e.g., USD + LBP)
   - Payment method (cash, card, Whish, OMT, etc.)
   - Collector name & badge ID
   - QR code for receipt verification
   - Digital signature / stamp
4. **Sent to customer simultaneously through multiple channels:**
   - **WhatsApp Business API (primary)** — message + PDF attachment + portal link
   - **SMS (fallback)** — short text with link to view PDF online
   - **Email** — if customer has email on file
   - **In-app notification** — if customer has the customer mobile app
5. **If service was suspended (RADIUS), payment automatically reactivates internet/electricity within 60 seconds**
6. Customer can view/download receipt anytime from self-service portal

**Tenant admin can configure:**
- Enable/disable each channel independently (WhatsApp/SMS/Email)
- Customize message template per language (Arabic, English, French)
- Choose delivery format: PDF attachment, link, or both
- Send to primary phone, secondary phone, or both
- Add company social media links and marketing footer to receipt
- Schedule delayed send (e.g., end of day batch instead of immediate)

**Same engine handles all customer communications:**
- New invoice notification (when generated)
- Pre-due reminder (5 days before)
- Due-date reminder
- Overdue reminder + suspension warning
- Suspension confirmation with payment instructions
- Reactivation confirmation
- Welcome message (new customer)
- Package change confirmation

### 3.6 User Management & Permissions (RBAC)

**Role hierarchy:**
1. Super Admin (you, platform owner)
2. Tenant Owner (the ISP/utility company owner)
3. Tenant Admin (manager)
4. Branch Manager (multi-branch companies)
5. Accountant
6. Customer Service / Support
7. Sales Agent
8. Technician / Installer
9. Collector (mobile only)
10. Customer (self-service portal)

**Granular permissions (checkboxes):**
- View customers / Create / Edit / Delete
- View packages / Create / Edit / Delete
- View invoices / Create / Edit / Cancel / Apply discount
- View payments / Record / Refund
- View reports / Export
- Manage users / Manage roles
- Approve discounts above $X
- Access financial dashboard
- Suspend/activate service
- Send bulk SMS/WhatsApp

### 3.7 Customer Self-Service Portal & Mobile App
- View invoices & history
- Pay online (Stripe, local gateways, mobile wallets)
- View data usage / electricity consumption
- Open support ticket
- Request package change / upgrade
- Download receipts
- Update profile & contact

### 3.8 Technician / Installation Module
- Ticketing system (new install, repair, disconnection)
- Assignment to technician
- GPS check-in at customer location
- Photo documentation
- Materials used (inventory deduction)
- Customer signature
- Status: pending, in-progress, complete, failed

### 3.9 Reports & Analytics Dashboard
- Revenue (daily/weekly/monthly/yearly)
- Collection rate per collector
- DSO (Days Sales Outstanding)
- Aging report (30/60/90/90+ days)
- Top defaulters list
- ARPU (Average Revenue Per User)
- Churn rate
- Geographic heatmap of customers & payments
- Collector performance leaderboard
- Cash flow forecast
- Custom report builder
- Export to Excel/PDF

### 3.10 Communication Module
- **WhatsApp Business API (primary channel)** — invoices, reminders, receipts, 2-way support
- SMS gateway (fallback)
- Email
- In-app push notifications
- Bulk messaging campaigns
- Templates with variables
- Auto-reminders: 5 days before due, on due, 5 days after, suspension warning

### 3.11 Integrations
- **RADIUS / PPPoE** (FreeRADIUS) — auto-disconnect non-payers for ISPs
- **MikroTik API** — direct router management
- **Cisco / Huawei** equipment APIs
- **Smart electricity meters** (where available)
- **Payment gateways:** Stripe, PayPal, Whish, Areeba, OMT API, CashUnited, M-Pesa, Flutterwave
- **Accounting:** QuickBooks, Zoho Books, Xero
- **WhatsApp Business API** (Meta or Twilio or 360dialog)
- **SMS gateways:** Twilio, MessageBird, local providers
- **Maps:** Google Maps + OpenStreetMap fallback
- **REST API** for tenant developers to integrate their own systems

### 3.12 RADIUS & Network Integration Module (Detailed) ⭐

This module connects your SaaS to the ISP's network equipment so you can automatically authorize, suspend, reactivate, and monitor every customer in real time. It also lets you pull live data from existing open-source RADIUS systems.

**Supported open-source / standard systems:**

| System | What it is | Integration method |
|---|---|---|
| FreeRADIUS | The industry-standard open-source RADIUS server. Used by millions of ISPs worldwide. | `rlm_rest` module → REST API webhook to your SaaS |
| daloRADIUS | Web GUI for FreeRADIUS with built-in REST API | REST API + shared MySQL database |
| OpenWISP RADIUS | Django-based modern RADIUS controller with full REST API | Native REST API |
| MikroTik RouterOS | Most popular router OS for ISPs, especially in MENA/Africa/Asia | RouterOS API + RADIUS |
| Cisco / Huawei BNGs | Carrier-grade equipment | Standard RADIUS protocol |

**Two-way data flow:**

**Outbound (your SaaS → RADIUS / network):**
- Create user (PPPoE login + password + plan)
- Update plan / change speed (e.g., upgrade 10 Mbps → 50 Mbps)
- Suspend user (invoice unpaid X days)
- Reactivate user (after payment received)
- Force-disconnect active session (kick offline)
- Apply bandwidth limits & data quotas
- Change IP / VLAN / framed IP assignment
- Throttle speed (soft suspend)
- Set session time limits

**Inbound (RADIUS / network → your SaaS):**
- Real-time data usage (GB consumed this month)
- Live session info (online now / offline / last seen)
- Connection logs (login times, IP, MAC address, NAS port)
- Total monthly traffic per user (upload + download)
- Failed login attempts (security alerts)
- Connection quality metrics
- Hardware-level events (link up/down)

**How the technical flow works:**

1. Customer's modem sends PPPoE login → ISP's BNG (Broadband Network Gateway)
2. BNG forwards to FreeRADIUS server
3. FreeRADIUS calls your SaaS API: `POST /api/radius/authorize` with `{username, password, nas_ip}`
4. Your SaaS checks: Is customer active? Invoice paid? Within data quota?
5. Your SaaS responds: `{allow: true, speed: "50M/50M", session_timeout: 86400}` OR `{allow: false}`
6. FreeRADIUS replies to BNG: customer connects with assigned speed
7. Every few minutes, FreeRADIUS sends usage stats (`POST /api/radius/accounting`) back to your SaaS
8. Your SaaS stores it for customer dashboard, bill calculation, alerts

**Auto-suspension / auto-reconnect engine:**

Tenant admin defines rules like:
- Suspend if invoice 7 days overdue
- WhatsApp warning 2 days before suspension
- Auto-reconnect within 60 seconds of payment
- Grace period: 3 days after suspension before service termination
- Throttle to 1 Mbps instead of full disconnect (soft suspend mode)
- Walled-garden redirect (suspended user sees "pay now" page only)

**Migration / import from existing systems:**

A huge selling point — ISPs already running daloRADIUS, FreeRADIUS, or any other system can switch to your SaaS without disruption:
- Auto-import existing users from daloRADIUS / MySQL `radcheck`, `radreply`, `usergroup` tables
- Sync ongoing usage data both directions during transition
- Side-by-side mode (run old + new for X weeks before cutover)
- Bulk import from CSV / Excel
- API import from any system that exposes REST/SOAP

**Multi-NAS / multi-router support:**
- ISPs with several towers, BNGs, or branch locations can register each NAS in your SaaS
- Per-NAS authentication keys
- Route different customers to different NAS based on location
- Failover support (primary NAS down → secondary takes over)

**Captive portal / hotspot integration:**
- For coffee shops, hotels, public WiFi resellers
- Voucher generation (printable PIN cards)
- Time-limited or data-limited vouchers
- Branded login page per tenant
- Social login (Google / Facebook / WhatsApp OTP)

**Security:**
- All RADIUS API endpoints protected with token auth + IP whitelist
- HTTPS only (TLS 1.3)
- Rate limiting on auth endpoints
- Audit log of every authorize/disconnect/change event
- Encrypted password storage (bcrypt for portal passwords, RADIUS uses CHAP/PAP/MS-CHAP standard)

---

## 4. Differentiators (Ideas Competitors Don't Have)

1. **WhatsApp-first communication** — primary channel, not afterthought
2. **AI collection prioritization** — predict who pays today, push to top of collector's list
3. **Dual-currency native** (USD + local) for unstable economies
4. **Cash float & vault management** — multi-step cash flow with approvals
5. **Generator subscription module** (Lebanon-specific, regionally unique)
6. **Anti-fraud GPS + photo validation**
7. **White-label / reseller model** for big ISPs to onboard sub-ISPs
8. **Voice notes** in collector app (faster than typing in Arabic on small screen)
9. **Offline-first collector app** (works in poor connectivity areas)
10. **Hardware integration** (auto-suspend MikroTik routers at midnight if unpaid)
11. **Customer mobile app** with pre-filled Whish/OMT references
12. **Power outage tracker** for electricity tenants (log outages, auto-credit customers)
13. **Referral & loyalty engine** for tenants to retain customers
14. **AI chatbot for customer support** (Arabic + English)

---

## 5. Recommended Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Backend API | Laravel 11 (PHP) OR NestJS (Node.js) | Laravel: fastest SaaS multi-tenant. NestJS: better for real-time |
| Frontend (Web) | Next.js 15 (React) + TailwindCSS | SEO, speed, ecosystem |
| Mobile (Collector + Customer) | Flutter | One codebase, excellent offline, fast |
| Database | PostgreSQL | Reliability, JSON support, multi-tenancy |
| Cache & Queues | Redis + Horizon (Laravel) or BullMQ (Node) | Background jobs, real-time |
| Real-time | WebSockets — Pusher / Soketi / Ably | Live collector tracking |
| File storage | S3 (AWS) or Cloudflare R2 (cheaper) | Photos, receipts, docs |
| Hosting (start) | Hetzner Cloud (€20/month VPS) | Cheap, reliable for MVP |
| Hosting (scale) | AWS (ECS / RDS / ElastiCache) | When you cross 50+ tenants |
| Maps | Google Maps Platform + OSM fallback | Industry standard |
| Payments | Stripe + Whish + Areeba + OMT | Local + global |
| WhatsApp | Meta Business API or 360dialog | Required for region |
| RADIUS | FreeRADIUS | ISP auto-disconnect |
| Monitoring | Sentry + Grafana + Uptime Kuma | Error tracking + uptime |
| CI/CD | GitHub Actions + Docker | Standard pipeline |

---

## 6. Pricing Tiers (What You Sell to ISPs)

| Plan | Price/month | Customers | Collectors | Features |
|---|---|---|---|---|
| Starter | $49 | 500 | 2 | Core billing, 1 admin, email support |
| Growth | $149 | 3,000 | 10 | + WhatsApp, 5 admins, route opt., reports |
| Pro | $399 | Unlimited | Unlimited | + RADIUS, API, white-label, priority support |
| Enterprise | Custom | Unlimited | Unlimited | Multi-branch, dedicated server, SLA, training |

**Add-ons:**
- WhatsApp messages: $0.005 each above included quota
- SMS: pay-per-use
- Custom integrations: one-time fee
- On-site training: hourly rate

---

## 7. Build Roadmap (Phased)

### Phase 1 — MVP (3–4 months)
- Multi-tenant base + auth
- Customer management
- Packages
- Invoicing engine
- Basic collector mobile app (assignment, payment, receipt)
- Cash payments
- **Auto-send receipt via WhatsApp + SMS when collector marks "Paid"**
- PDF receipt generation with QR code
- Dashboard
- 1 payment gateway
- Email notifications

### Phase 2 — Growth Features (2–3 months)
- Full RBAC permissions
- WhatsApp Business API (full templates, 2-way support)
- Customer self-service portal
- Reports & analytics
- **RADIUS integration v1** — FreeRADIUS authorize + accounting endpoints, auto-suspend / auto-reconnect engine
- **MikroTik RouterOS API integration**
- Multi-currency
- Route optimization
- Offline collector mode

### Phase 3 — Differentiation (2–3 months)
- AI collection prioritization
- Electricity & generator modules
- Anti-fraud GPS validation
- Cash vault management
- Advanced reports
- Customer mobile app
- **daloRADIUS / OpenWISP migration tool** (import existing customers from old systems)
- **Multi-NAS support** for ISPs with multiple towers/branches
- **Captive portal / hotspot module** for cafes & public WiFi

### Phase 4 — Scale (3+ months)
- White-label / reseller model
- Marketplace of integrations
- Multi-branch support
- Public REST API (full documentation, sandbox)
- AI chatbot
- Hardware integrations (smart meters, IoT)
- **Voucher / scratch-card system** for prepaid ISPs

---

## 8. Go-to-Market Strategy

1. **Start hyper-local** — pick 3–5 ISPs in Lebanon, give them 50% off for 1 year in exchange for case studies and feedback
2. **Build in public** — share progress on LinkedIn, Twitter, Reddit (r/WISP, r/networking)
3. **Free tier for tiny operators** (under 100 customers) to build word-of-mouth
4. **Partner with router resellers** (MikroTik, Cisco distributors) for referrals
5. **Attend WISPAPALOOZA** and regional ISP conferences
6. **YouTube channel** showing platform tutorials in Arabic + English
7. **Reseller program** — local IT consultants sell + implement, take 20% commission

---

## 9. Compliance & Security Checklist

- PCI DSS for any direct card processing (or use Stripe to offload it)
- GDPR-ready data handling
- Per-tenant data isolation guarantee
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Daily automated backups (off-site)
- Two-factor authentication for admins
- Audit log on every sensitive action
- Role-based field-level data access
- Data export tool (customer right to data portability)
- Penetration testing yearly
- Bug bounty program (later)

---

## 10. Estimated Initial Investment

| Item | Cost (USD) |
|---|---|
| 2 backend devs (4 months, freelance) | $20,000–40,000 |
| 1 mobile dev (4 months) | $10,000–20,000 |
| 1 frontend dev (4 months) | $10,000–20,000 |
| 1 designer (UI/UX, part-time) | $3,000–6,000 |
| Infrastructure (year 1) | $1,500–3,000 |
| WhatsApp Business API setup | $500–1,500 |
| Domain, branding, legal | $2,000–4,000 |
| Marketing (year 1) | $5,000–15,000 |
| **Total MVP** | **$52,000–110,000** |

You can cut this in half by starting solo or with a co-founder developer, building MVP yourself, and using open-source where possible.

---

## 11. Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Big competitors (Splynx, Sonar) have features you don't | Win on regional fit, language, WhatsApp, collector UX |
| Cash collection fraud by collectors | GPS validation, photo proof, cash reconciliation alerts |
| Currency volatility (LBP) | Lock invoice in USD, daily rate updates |
| Customer churn | Long-term contracts, loyalty discounts |
| Data breach | Encryption, audits, insurance |
| WhatsApp API restrictions | Have SMS fallback always ready |
| Tenant non-payment of YOUR fees | Auto-suspend tenant if unpaid 7 days |

---

## 12. Next Steps (What to Do This Week)

1. Validate by talking to 5–10 ISPs / utility companies — what do they pay now? What do they hate?
2. Pick a name + buy domain
3. Decide solo build vs hire team
4. Choose tech stack (recommend: Laravel + Next.js + Flutter)
5. Sketch UI on paper / Figma — collector app screens first (most important)
6. Set up GitHub, Linear/Jira, Slack
7. Build a landing page with waitlist
8. Start MVP — focus on multi-tenant base + customer + invoice + collector app

---

*Document prepared as a starting blueprint. Adapt to your specific market and resources.*
