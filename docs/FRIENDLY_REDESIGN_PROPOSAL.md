This is a documentation/proposal task — the audits are already done and provided. I'll synthesize directly into the requested proposal. No file reads needed since the inputs are complete.

# RunCollect Friendly-Redesign Proposal

A plan to make RunCollect usable by any non-technical collector or office clerk with zero training, modeled on the "add → remind → mark paid" simplicity of khata/ledger apps (Khatabook, OkCredit) and agent apps (M-PESA for Business) — while keeping the full power (RADIUS, multi-tenant, reports) for the boss, just out of the way.

---

## 1. Design principles ("anybody can use it")

1. **One screen = one job, 2-3 taps to money.** The collector's daily loop is a linear stack, not a tree of menus. Open app → tap customer → Collect → done. No tabs, no nested settings in the field path. Target: cash + full balance recorded in **2 taps**.
2. **Big single-purpose buttons, primary action always visible.** Full-width "Collect" / "Confirm" buttons ≥64dp tall, pinned to the bottom so they're never below the fold. Base font ≥18sp; amounts and names 24-32sp for outdoor/older eyes.
3. **Color + icon status, never color alone.** Fixed code everywhere — green check = paid, red ! = overdue, amber ◐ = partial/due soon, grey = no info. Always pair the color with an icon and a short word (sunlight + colorblind safe). Amount due is the dominant numeral on every row.
4. **Arabic-first, RTL done right.** Mirror the whole layout with start/end (never hardcoded left/right); don't mirror numbers/camera/clock icons. Western Arabic digits 0-9 for Lebanon. Informal phrasing ("اللي عليه" not formal financial Arabic). Brand name + currency codes stay Latin and let bidi handle the mix.
5. **Offline-first, visibly reassuring.** Write to local DB first (zero wait), sync in background, show "Saved — will sync" and an "X to sync" badge. The collector never waits on the network to record money; trust in offline saves is the adoption driver.
6. **Minimal typing.** Pre-fill amount = balance due, collector ID, date. Numeric keypad + quick-amount buttons ("Full / Half / Custom"), not free-text. Never block a save to demand typed justification.
7. **Hide power-features from collectors.** RADIUS, split payments, reports, language/logout, settings — none of these belong in the field path. Push them to the boss's web admin or an overflow menu. Friendliness = aggressive removal.

---

## 2. Best ideas to steal (named)

- **Khatabook / OkCredit — "mark paid = record a payment."** Status is implied by the running balance, not a dropdown. Paid → row turns green and drops off the overdue list. Steal this for RunCollect: kill the explicit status machinery.
- **Khatabook — one-tap pre-filled WhatsApp reminder.** Tap balance → "Send reminder" → WhatsApp opens with Arabic message already written (name + amount due). Steal for both the collector ("couldn't collect, remind") and the admin bulk-remind.
- **M-PESA for Business — USSD-grade agent simplicity + float reconciliation.** A handful of huge actions; instant SMS = the receipt; commission/float visible so the agent self-reconciles. Steal: the 3-tap collect flow, SMS-receipt-on-save, and the per-collector cash-held reconciliation view.
- **ISPMate — auto SMS/WhatsApp receipt in Arabic on every payment.** Collector hand-writes nothing; the message is the proof. Steal directly.
- **UISP — one customer = one screen** holding balance + recurring + ad-hoc charges. Steal: collapse RunCollect's customer-detail interstitial into the collect flow.
- **Splynx Field Service — offline mode + map-day-list + one-tap navigate + barcode-to-identify.** Steal offline sync badge and (later) QR-scan-the-router to open a customer.
- **daloRADIUS / Powercode — anti-patterns.** Never expose RADIUS internals or 17 gateway toggles to non-technical staff. One opinionated payment path.
- **Admin "Needs your attention" list (SMB dashboard research).** Plain-language rows each with a button ("23 overdue → Send reminder"). Steal as the heart of the owner dashboard.

---

## 3. Collector app redesign — screen by screen

Goal: **2-tap payment** for the common case (cash, full balance). Today it's **4 taps across 3 screens + a dialog, with 2 network waits** (audit §1).

### Screen 1 — "Today" list (replaces Assignments)
`assignments_screen.dart`

The home screen is a single scrollable list of today's stops, ordered by area. Each row:
- Customer name (24sp) + area
- **Amount due, large bold numeral** (USD with ≈LBP underneath)
- Color+icon status chip (red overdue / amber partial / green paid)
- A full-width row that taps straight into Collect

**REMOVE / HIDE from the current app bar (`:112-181`):**
- Move **language popup** and **logout** into a single overflow "⋯" / settings menu — an older collector reaching for sync must not hit logout (which throws a confirm dialog with pending payments, `:154-172`).
- Drop the **duplicate handover entry point** — keep only the green "cash on hand" bar (`:186-188`), remove the redundant wallet icon (`:113-119`). Tapping the cash bar goes to handover.
- Keep the **"X unsynced" amber banner** (`:185`) — it's correct and reassuring. Keep sync.

Top of list shows **"Collected today: $___"** running total (M-PESA-style at-a-glance performance).

### Screen 2 — go STRAIGHT to Collect (skip Customer Detail)
`customer_detail_screen.dart` (remove from the hot path), `record_payment_screen.dart`

Today, tapping a row routes through Customer Detail which fires **3 API calls** (`customer_detail_screen.dart:50-68`) and renders all invoices + grouped history before the collector can reach the FAB (audit §2B). Since the assignment already targets a specific open invoice (`assignments_screen.dart:357`, `preferredInvoiceId` / `firstOpenInvoiceId:34-42`):

- **Tap a Today row → open Collect directly** for that invoice. No interstitial, no 3-call fan-out, no scrolling past payment history.
- Add a small secondary **"View customer"** link inside Collect for the rare case someone needs history. Customer Detail stays in the codebase, just off the daily path.

### Screen 3 — Collect (the one that matters)
`record_payment_screen.dart` — this screen carries far more than the common case (audit §2A, §3).

**New default layout (single cash payment):**
- Big **amount field, pre-filled to balance** (already done `:84-86`), with **dual-currency USD ≈ LBP** shown live (currently missing entirely — audit §2A, a headline feature absent from the file).
- Quick-pick buttons: **Full / Half / Custom**.
- One full-width primary button: **"Collect Cash"** pinned to the bottom.
- That's the whole screen. Cash + full balance = open Collect, tap "Collect Cash" → done.

**REMOVE / HIDE behind an "Other method / split" expander:**
- The always-present **split-payment machinery** — `_Split` list (`:55`), "Add method" (`:410-413`), per-row remove circles (`:564-569`), running total (`:416-420`). An accounting detail leaking into the field (audit §3.1). Collapse it; 99% never open it.
- The **6-item method dropdown** (`:552-559`). Replace with **2-3 big tiles** — Cash (primary) + "Other" (reveals Whish/OMT/bank/card). A `DropdownButtonFormField` is a mis-tap magnet for low-tech users (audit §3.2).
- **Notes + 2 proof rows** (`:424-466`) move below/behind the primary button, optional, collapsed under "Add photo / signature."

**Photo + signature (`:158-167`, `:634-697`):** keep, but make them optional collapsed actions on the Collect screen, not a mandatory full-screen round-trip. The separate `_SignaturePadScreen` jump confuses "where am I / is it saved" (audit §3.4) — open it inline as a sheet.

**Geofence override (`:171-222`, `:282-290`) — soften, never block:**
- Replace the modal demanding **≥4 typed characters** (`reasonMin4`, `barrierDismissible:false`) with **one-tap reason chips**: "Customer moved" / "GPS weak" / "Indoors." Save proceeds regardless. Typing a justification in a second language under the customer's gaze is a real-world stall (audit §3.3). **Never abort the save on cancel** (currently does, `:285-289`).

### Screen 4 — Success (real, not a transient dialog)
Currently just a receipt dialog + auto-pop (`:339-341`) — no clear "done" (audit §3.7).

- **Full-screen green check** + "Collected $50 from Ahmad" + running **"Collected today: $___."**
- Receipt **auto-fires Arabic SMS/WhatsApp** to the customer (ISPMate pattern) — the message is the proof.
- Brief **Undo** window for fat-finger mistakes.
- (Later) optional Bluetooth thermal print for cash-culture customers who want paper.

### Cash handover — remove the trap
`handover_screen.dart`

- Today, if counted ≠ expected by >$0.01 the submit **throws** unless a note is typed (`:173-177`) — a genuinely-short collector is stuck with a red error and no path (audit §2D). Instead: **allow the short/over handover**, show "You're short $X — add a note?" with optional chips, and submit either way. Flag the discrepancy to the boss instead of blocking the collector.
- Make the **supervisor selection required** (currently defaults to "Not specified," `:326-327`, silently skipping accountability).

---

## 4. Admin / employee redesign — friendly dashboard

Goal: owner opens it and instantly knows **"Am I OK?"** and **"What do I do now?"** Two surfaces today with confusing division of labor (audit §3).

### The owner dashboard (web + Flutter), 4 zones top-to-bottom

**Zone 1 — ≤5 big numbers, each with a comparison.** Collected this month (+12% vs last), Overdue, Active customers, Open tickets. A number with no comparison is noise.
- **Surface dual currency USD + LBP side by side** on both dashboards — currently only a single USD figure (audit §2 money). Centralize **one money formatter per platform** to kill the 0-vs-2-decimal inconsistency (Flutter regex `_money()` vs web `Intl.NumberFormat`).

**Zone 2 — "Needs your attention" action list (the heart).** Plain-language rows, each with a button:
- "23 customers overdue → **Send reminder**" (bulk WhatsApp)
- "5 new signups waiting → **Approve**"
- "3 cash drops to confirm → **Confirm**"
- Color+icon badges, never color alone.

**Zone 3 — one simple trend.** Single "Collections, last 6 months" chart. Not a grid.

**Zone 4 — quick links / recent 5 payments** below the fold.

**REMOVE from the owner's main view:**
- The **"BACKUP FAILING" infra chip** (`dashboard/page.tsx` ACTION_META) — alarming, meaningless to a non-technical owner. Move to Settings → Health.
- The **15+-action audit feed** — demote below the fold; the boss doesn't run the business off an audit log.

### One-tap bulk actions
The biggest time-saver. Overdue filter → **Select all** → **Send SMS reminder** → 3 taps for 50 customers. Sticky bottom bar: "23 selected — Send payment reminder." Short literal labels (Send reminder, Mark paid, Suspend, Approve). Confirm + undo on destructive ones (Suspend).

### Simpler reports, not analytics
Replace the eager `Promise.all` of 4 heavy reports (audit §2 reports) with **3-4 pre-built reports**, each a plain question, default date range "This month," and **Export PDF + one-tap WhatsApp share**:
- "How much did I collect?" (by day/agent/area)
- "Who still owes me?"
- "New vs lost customers"

### Nav + Settings cleanup
- **Rename engineer-speak** (`nav.ts`): "RADIUS" → "Internet service (disconnect/reconnect)"; "Cash handovers" → "Cash drops"; "Aging" → "Overdue by age." Section headers → "Daily work / Money / Setup."
- **Merge "Collectors" + "Collectors Live"** into one screen with a Map/List toggle (the Flutter live map already does this). Remove the redundant sidebar entry — collector-tracking is currently reachable from 4 places.
- **Restructure the 13-card Settings hub** (`settings/page.tsx`) into 3-4 groups: **My account / Team & roles / Billing & currency / Advanced** (RADIUS secret, NAS, permissions grid, payment routing tucked under Advanced). Add Arabic-first labels.
- **Progressive disclosure on the customer form** (`customer-form-fields.tsx`): required block first (name + phone + status with friendly labels, not raw enums like "prospect"); collapse address/map/notes under "More details."
- **Status labels next to color dots + a legend** on the live map and lists (older eyes, outdoors).

### Phone vs web split (make it unambiguous)
- **Flutter = read + approve:** KPIs, "needs attention," live map, **confirm cash drops natively**, look up customer. Remove "open admin web" as a primary action.
- **Web = the workhorse:** full CRUD, bulk actions, reports, settings.

---

## 5. Keep the power for the boss

Nothing is deleted — it moves out of the collector's way:

- **RADIUS** (suspend/reactivate/change-speed, session inspection): stays in web admin under "Internet service," tucked in Advanced. Never on the collector phone.
- **Split payments, refunds, payment routing, 17-gateway concerns:** stay in web; collector sees only Cash + "Other."
- **Tickets, message templates, zones, permissions grid, 2FA, audit log:** stay in web Settings (grouped/Advanced).
- **Live map + collector reconciliation (float model):** stays for the boss — it's the cash-trust tool. One place (merged Collectors screen), not four.
- **Multi-tenant / super-admin** (tenants, plans, SMTP, branding): untouched, separate super-admin area.
- **Full reports / charts:** still available on web for the boss; just not the collector's or the default owner-dashboard surface.
- **Customer Detail screen** (history, all invoices): kept, reachable via "View customer," off the collector hot path.

---

## 6. Concrete build plan (ordered, low-risk)

Highest-impact collector flow first; each item is small and shippable.

**1. Collapse the Collect screen to one cash button.**
Hide split machinery + 6-item dropdown behind an "Other method / split" expander; replace dropdown with Cash + "Other" tiles; pin a full-width "Collect Cash" button to the bottom.
`record_payment_screen.dart` (`:55, :392-422, :545-561, :467-484`)
→ Biggest single drop in taps and confusion.

**2. Add dual-currency display + a real success screen.**
Live USD ≈ LBP on the amount field; full-screen green check with "Collected today" total replacing the receipt dialog.
`record_payment_screen.dart` (no LBP today; success only `:339`)

**3. Soften the geofence override; never block save.**
One-tap reason chips instead of ≥4 typed chars; remove `barrierDismissible:false` and the cancel-aborts-save path.
`record_payment_screen.dart` (`:171-222, :282-290`)

**4. Skip the Customer Detail interstitial.**
Route Today-row → Collect directly using `preferredInvoiceId`/`firstOpenInvoiceId`; add a secondary "View customer" link.
`assignments_screen.dart` (`:356-358`), `customer_detail_screen.dart` (`:34-42, :50-68`), `router.dart`

**5. Declutter the collector home app bar + add "Collected today" total.**
Move language + logout to an overflow menu; remove the duplicate handover entry (keep the cash bar); add today's running total atop the list.
`assignments_screen.dart` (`:112-181, :185-188`)

**6. Fix the cash-handover trap.**
Allow short/over submit with optional note chips (don't throw); make supervisor required.
`handover_screen.dart` (`:173-177, :326-327`)

**7. Rebuild the owner dashboard around "Needs your attention" + ≤5 numbers with comparisons; remove the backup chip and demote the audit feed; show dual currency.**
`web-admin/.../dashboard/page.tsx`, `mobile-collector/.../admin/admin_dashboard_screen.dart`

**8. Nav + Settings cleanup.**
Rename engineer-speak, merge Collectors + Collectors Live, regroup the 13-card Settings into 4 sections.
`web-admin/src/lib/nav.ts`, `web-admin/.../settings/page.tsx`

Items 1-6 are collector-app-only and independently shippable (each a self-contained PR). Items 7-8 are admin-side and can land in parallel by a different work session. Auto-SMS/WhatsApp receipt, bulk reminders, and Bluetooth printing are fast follow-ups once the success screen (item 2) and the admin "needs attention" list (item 7) exist.

---

**Files referenced (all absolute):**
- `/Users/mes/development/collector-SaaS/mobile-collector/lib/features/payments/record_payment_screen.dart`
- `/Users/mes/development/collector-SaaS/mobile-collector/lib/features/customers/customer_detail_screen.dart`
- `/Users/mes/development/collector-SaaS/mobile-collector/lib/features/assignments/assignments_screen.dart`
- `/Users/mes/development/collector-SaaS/mobile-collector/lib/features/cash_handover/handover_screen.dart`
- `/Users/mes/development/collector-SaaS/mobile-collector/lib/core/router.dart`
- `/Users/mes/development/collector-SaaS/mobile-collector/lib/features/admin/admin_dashboard_screen.dart`
- `/Users/mes/development/collector-SaaS/mobile-collector/lib/features/admin/admin_live_map_screen.dart`
- `/Users/mes/development/collector-SaaS/web-admin/src/lib/nav.ts`
- `/Users/mes/development/collector-SaaS/web-admin/src/app/(dashboard)/settings/page.tsx`
- `/Users/mes/development/collector-SaaS/web-admin/src/app/(dashboard)/dashboard/page.tsx`
- `/Users/mes/development/collector-SaaS/web-admin/src/components/customers/customer-form-fields.tsx`