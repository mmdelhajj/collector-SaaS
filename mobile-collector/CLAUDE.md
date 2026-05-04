# Claude Code Prompt — Flutter Collector Mobile App

> **How to use:** Save this file as `CLAUDE.md` inside your `mobile-collector/` folder. Open Claude Code from inside that folder. The backend prompt (parent CLAUDE.md) covers the overall project; this one is mobile-specific.

---

## CONTEXT

This Flutter app is the **field collector mobile app** for an ISP/utility SaaS platform. Collectors physically visit customers door-to-door, collect cash payments, mark invoices paid, and the system auto-sends WhatsApp/SMS receipts. The app must work **offline** in poor-connectivity areas (Lebanon, MENA, Africa) and sync when back online.

**Backend:** Laravel API at `https://api.{tenant}.example.com/api/v1/` — already built, see `../backend/`.

**Users of this app:** Field collectors (low-tech, often older, primarily Arabic speakers). UX must be **simple, large buttons, fast, forgiving of mistakes**.

---

## TECH STACK (DO NOT DEVIATE)

| Concern | Choice |
|---|---|
| Framework | Flutter 3.x (latest stable) |
| Language | Dart, sound null-safety |
| State management | Riverpod 2.x (with code generation) |
| Local DB | Drift (formerly Moor) — SQLite with type-safe queries |
| HTTP client | Dio + dio_cache_interceptor + retry interceptor |
| Models | Freezed + json_serializable |
| Routing | go_router |
| Maps | flutter_map (OpenStreetMap) — switch to Mapbox later |
| Geolocation | geolocator |
| Background tasks | workmanager + flutter_background_service |
| Push | firebase_messaging |
| Camera | image_picker + image_cropper |
| Signature | signature package |
| Voice notes | record + just_audio |
| Localization | flutter_localizations + intl + arb files |
| Storage | flutter_secure_storage (tokens) + shared_preferences (settings) |
| Forms | flutter_form_builder + form_builder_validators |
| Charts (dashboards) | fl_chart |
| Bluetooth printer | esc_pos_bluetooth (for thermal receipt printers) |
| QR scanner | mobile_scanner |
| Connectivity | connectivity_plus |
| Permissions | permission_handler |
| Logging | logger |
| Error tracking | sentry_flutter |

---

## FOLDER STRUCTURE

```
lib/
├── main.dart
├── app.dart                    # MaterialApp + theme + router setup
├── core/
│   ├── constants/
│   │   ├── api_endpoints.dart
│   │   ├── app_colors.dart
│   │   ├── app_text_styles.dart
│   │   └── app_durations.dart
│   ├── errors/
│   │   ├── failures.dart       # Sealed classes: NetworkFailure, ServerFailure, CacheFailure
│   │   └── exceptions.dart
│   ├── network/
│   │   ├── dio_client.dart
│   │   ├── api_interceptor.dart
│   │   ├── auth_interceptor.dart
│   │   └── retry_interceptor.dart
│   ├── storage/
│   │   ├── secure_storage.dart
│   │   └── preferences.dart
│   ├── database/
│   │   ├── app_database.dart   # Drift main DB
│   │   ├── tables/
│   │   └── daos/
│   ├── services/
│   │   ├── location_service.dart
│   │   ├── connectivity_service.dart
│   │   ├── sync_service.dart
│   │   ├── notification_service.dart
│   │   └── biometric_service.dart
│   ├── utils/
│   │   ├── currency_formatter.dart
│   │   ├── date_formatter.dart
│   │   ├── validators.dart
│   │   └── extensions/
│   └── theme/
│       ├── app_theme.dart
│       ├── light_theme.dart
│       └── dark_theme.dart
├── features/
│   ├── auth/
│   │   ├── data/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   └── datasources/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   └── usecases/
│   │   └── presentation/
│   │       ├── providers/
│   │       ├── screens/
│   │       │   ├── login_screen.dart
│   │       │   ├── pin_setup_screen.dart
│   │       │   └── biometric_screen.dart
│   │       └── widgets/
│   ├── home/
│   │   └── presentation/
│   │       └── screens/home_screen.dart    # Today's dashboard
│   ├── assignments/
│   │   ├── data/, domain/
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── assignments_list_screen.dart
│   │       │   ├── assignment_detail_screen.dart
│   │       │   └── route_map_screen.dart
│   │       └── widgets/
│   ├── customers/
│   │   └── presentation/
│   │       └── screens/customer_detail_screen.dart
│   ├── payments/
│   │   ├── data/, domain/
│   │   └── presentation/
│   │       ├── screens/
│   │       │   ├── record_payment_screen.dart
│   │       │   ├── payment_method_screen.dart
│   │       │   ├── payment_confirmation_screen.dart
│   │       │   └── receipt_preview_screen.dart
│   │       └── widgets/
│   │           ├── amount_input.dart
│   │           ├── payment_method_picker.dart
│   │           └── signature_pad.dart
│   ├── cash_handover/
│   │   └── presentation/
│   │       └── screens/handover_screen.dart
│   ├── sync/
│   │   └── presentation/
│   │       ├── screens/sync_status_screen.dart
│   │       └── widgets/sync_indicator.dart
│   ├── settings/
│   │   └── presentation/
│   │       └── screens/settings_screen.dart
│   └── tickets/                # Phase 2 — installation/repair tickets
├── shared/
│   ├── widgets/
│   │   ├── app_button.dart     # Large, accessible buttons
│   │   ├── app_text_field.dart
│   │   ├── app_card.dart
│   │   ├── loading_indicator.dart
│   │   ├── empty_state.dart
│   │   ├── error_view.dart
│   │   ├── offline_banner.dart
│   │   └── customer_avatar.dart
│   └── providers/
│       ├── auth_provider.dart
│       ├── connectivity_provider.dart
│       └── locale_provider.dart
└── l10n/
    ├── app_en.arb
    ├── app_ar.arb
    └── app_fr.arb
```

Architecture: **Clean Architecture (data/domain/presentation)** for each feature. State with Riverpod providers. UI is dumb — all logic in providers/usecases.

---

## CRITICAL FEATURES TO BUILD

### 1. Login & Auth
- Phone number + password OR email + password (tenant chooses, configurable)
- After first successful login → user sets a 4-digit PIN locally for fast re-entry
- Optional biometric (fingerprint/face) instead of PIN
- JWT token stored in `flutter_secure_storage`
- Refresh token on app open if < 5 min from expiry
- Logout clears local DB **only if** all pending payments are synced (warn user otherwise)

### 2. Today's Assignments (Home Screen)
- List of customers/invoices assigned to this collector for today
- Sorted by GPS proximity to collector's current location
- Each item shows: customer name, address, amount due, status badge
- Color coding: green (collected), red (overdue), yellow (in progress)
- Pull-to-refresh syncs from server
- Search bar (filters local list)
- "Map view" toggle → see all customers as pins on a map
- Counter at top: "12/45 collected today — $1,240 / $4,500"

### 3. Route Map View
- Map (flutter_map + OSM tiles) showing all assigned customers as pins
- Pin color = status
- Tap pin → mini card with name + address + "Navigate" button
- "Optimize Route" button — calls backend to reorder by shortest path
- Live blue dot for collector's own location
- Toggle between "Standard" and "Satellite" view

### 4. Customer Detail Screen
Shows everything about a customer:
- Photo + name + phone (tap to call) + WhatsApp button
- Full address with "Navigate" button (opens Google Maps / Waze)
- Outstanding invoices list
- Payment history
- Service status badge
- Notes (read-only, from manager)
- Big floating button: **"Record Payment"**

### 5. Record Payment Screen ⭐ (most important screen)

This is the core flow. Make it **fast** — collector should complete in under 30 seconds.

**Step 1 — Amount:**
- Large numpad input
- Pre-filled with full balance due (collector can edit for partial)
- Dual currency display: "$50.00 ≈ 4,475,000 LBP" (live conversion)
- Quick-pick buttons: "Full balance", "Half", "Custom"

**Step 2 — Method:**
- Big tile buttons: Cash, Card, Whish, OMT, Bank Transfer, Other
- For non-cash: optional reference number field

**Step 3 — Proof (optional, configurable per tenant):**
- Camera button → take photo (currency, signed slip, customer holding ID, etc.)
- Signature pad (customer signs with finger)
- Voice note button (hold to record, max 60s)

**Step 4 — Confirm:**
- Summary card showing all entered info
- **GPS validation** — must be within X meters of customer location (config, default 200m). If too far → warning, requires manager override code.
- Big green "Mark as Paid" button
- Tap → animated success → instant local save → background sync starts

**Behind the scenes (instant, no waiting):**
1. Save payment to local Drift DB with `is_synced: false`
2. Update local invoice status, customer balance
3. Show success screen with: "Receipt being sent to customer via WhatsApp"
4. Background isolate attempts to POST to `/api/v1/payments`
5. On success: mark `is_synced: true`, update server-generated receipt PDF URL
6. On failure: queue retry (every 5 min), show in sync indicator

### 6. Receipt Preview & Print
- After payment, show generated receipt
- Buttons: "Send WhatsApp" (resend), "Send SMS" (resend), "Print" (Bluetooth thermal printer), "Share PDF"
- "Done" returns to assignments list

### 7. Bluetooth Receipt Printer (Optional but Powerful)
- Settings → "Pair Printer" → scan for ESC/POS thermal printers
- Once paired, print button is active on receipt screen
- Print format: 58mm or 80mm thermal paper, includes Arabic if needed (use bitmap rendering for Arabic since most thermal printers don't support Arabic fonts natively)

### 8. Cash Handover Flow
- End of day → "Handover Cash" button on home screen
- Shows: total cash collected today, breakdown by currency
- Collector enters: actual cash count (must match), supervisor name
- Photo of cash + signed slip
- Supervisor signs on collector's phone
- Submitted → status `pending` until supervisor confirms in admin panel

### 9. Offline Mode (Make This Bulletproof)

**Sync strategy:**
- On login: full sync of assigned data (customers, invoices, packages, message templates)
- Throughout day: every action saved locally first, queued for sync
- Background isolate runs `SyncService` every 2 minutes when online
- Manual "Sync Now" button in settings + sync indicator widget always visible
- Conflict resolution: server wins on customer/invoice data, but **local payments are never overwritten**

**Sync queue priority:**
1. Payments (highest — money matters)
2. Cash handovers
3. Customer location pins (collector updated)
4. Voice notes / photos
5. GPS track points (lowest — for analytics only)

**What works offline:**
- View all assigned customers and invoices
- Record payments (cash, with photos and signatures)
- Generate receipt PDF locally (using a stored template)
- Print to Bluetooth printer
- Send receipt as PDF via WhatsApp/SMS using device's native share sheet (yes, even offline! WhatsApp will queue)
- Take photos and voice notes
- View payment history (synced data)
- Search local data

**What needs internet:**
- Login (first time)
- Force-sync
- Real-time route optimization
- Live map tiles (cache them aggressively)
- Server-generated receipt PDF (fall back to locally-generated)

**Show clear UI for offline state:**
- Persistent banner at top: "Offline — 3 payments waiting to sync"
- Sync indicator icon in app bar (rotating when syncing, red dot if errors)
- Sync status screen accessible from anywhere

### 10. GPS Tracking
- Background location enabled with user consent
- Pings every 60 seconds when on duty
- Stored locally, synced in batches
- Battery-friendly (use significant change API, not high accuracy)
- Used for: route history, anti-fraud, manager live view

### 11. Anti-Fraud Checks (Built-in)
- GPS distance check at payment time (warn if > 200m from customer)
- Photo timestamp watermark (camera plugin embeds time + GPS in image metadata)
- Cash on hand alert: if untendered cash > $500, force handover prompt
- Lock app after 5 min idle, require PIN to reopen
- Detect rooted/jailbroken device → log to server (don't block — too aggressive)

---

## UX & DESIGN GUIDELINES

### Design principles
- **Big touch targets** — minimum 56dp height for buttons, 48dp for list items
- **High contrast** — collectors work outdoors, in sun
- **One primary action per screen** — never make them choose between multiple equal-weight buttons
- **Forgiving** — confirm before destructive actions, allow undo where possible
- **Fast feedback** — every tap shows immediate visual response (don't wait for network)

### Color palette
- Primary: deep blue `#1E40AF`
- Success: green `#059669`
- Warning: amber `#D97706`
- Danger: red `#DC2626`
- Background: `#F8FAFC` (light) / `#0F172A` (dark)

### Typography
- Headers: Cairo (excellent Arabic support) or Tajawal
- Body: Inter (Latin) / Cairo (Arabic)
- Minimum body size: 16sp
- Labels & captions: 14sp
- Button text: 16sp, weight 600

### RTL Support
- App must auto-flip layout for Arabic
- Use `Directionality` widget at app root
- Test EVERY screen in both LTR and RTL
- Use `EdgeInsetsDirectional` (not `EdgeInsets`) for margins/padding
- Use `Alignment.centerStart` (not `centerLeft`)
- Numbers stay LTR even in Arabic (use `Directionality.of(context)` checks where needed)

### Localization rules
- All strings in `.arb` files, no hardcoded text
- Plural forms: use `intl` plural rules
- Currency: format with locale-aware separator (1,234.56 in en / 1.234,56 in fr / ١٬٢٣٤٫٥٦ in ar — but stick to Latin numerals for clarity in financial context)
- Dates: `DateFormat.yMMMd(locale).format(date)`

---

## STATE MANAGEMENT PATTERN (Riverpod)

Use Riverpod 2.x with code generation (`@riverpod` annotation).

```dart
// Example: assignments_provider.dart

@riverpod
class AssignmentsNotifier extends _$AssignmentsNotifier {
  @override
  Future<List<Assignment>> build() async {
    final repo = ref.watch(assignmentsRepositoryProvider);
    return repo.getTodayAssignments();
  }

  Future<void> markCompleted(String id) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(assignmentsRepositoryProvider);
      await repo.markCompleted(id);
      return repo.getTodayAssignments();
    });
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}
```

Repositories return `Either<Failure, T>` (use `dartz` or `fpdart`) for cleaner error handling. Each provider is auto-disposed when not in use.

---

## API INTEGRATION PATTERN

Use Dio with interceptors:

```dart
// Auth interceptor adds Bearer token
// API interceptor adds X-Tenant-ID header
// Retry interceptor: 3 attempts with exponential backoff for 5xx errors
// Error interceptor: maps HTTP errors to typed Failures
```

**Tenant resolution:** Tenant ID is stored at login (returned by `/auth/login`) and added to every request as `X-Tenant-ID` header. The base URL also includes the tenant subdomain.

---

## TESTING REQUIREMENTS

Three levels:

### Unit tests (`test/`)
- Every UseCase
- Every Repository (mock data sources with mocktail)
- Every utility/formatter
- All Riverpod notifiers

### Widget tests
- Every screen renders without crashing
- Form validation flows
- RTL rendering for at least one screen per feature

### Integration tests (`integration_test/`)
- Login → see assignments → record payment → verify local DB
- Offline flow: airplane mode → record payment → re-enable → verify sync

Aim for 60% coverage minimum. Run `flutter test --coverage` in CI.

---

## DEVELOPMENT WORKFLOW

### Setup
```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs   # for freezed/riverpod/drift
flutter run --flavor dev -t lib/main_dev.dart
```

### Build flavors
- `dev` — points to localhost backend, debug logging
- `staging` — points to staging API
- `production` — release builds

Each flavor has its own `main_<flavor>.dart` and Android applicationId suffix.

### Code generation
Run after editing any `@freezed`, `@riverpod`, or Drift table:
```bash
dart run build_runner watch --delete-conflicting-outputs
```

### Linting
```bash
dart format lib/ test/
flutter analyze
dart fix --apply
```

Use `analysis_options.yaml` with strict rules from `flutter_lints` + custom additions:
- `prefer_const_constructors`
- `avoid_print` (use logger)
- `require_trailing_commas`
- `unawaited_futures`

---

## INSTRUCTIONS FOR YOU (CLAUDE CODE)

1. **Read this CLAUDE.md and the `../STATUS.md` first.**
2. **Build incrementally** — one feature at a time, screen by screen, with tests.
3. **Don't skip code generation** — run `build_runner` after model/provider changes.
4. **Test offline mode aggressively** — this app's value is offline reliability.
5. **Always handle null safety** — no `!` operator unless 100% justified.
6. **Use `const` constructors everywhere possible** — performance matters.
7. **Don't add a package without asking** — keep dependencies lean.
8. **Test on a real low-end Android device** before shipping (or at least an emulator with low specs).
9. **Always preserve RTL layout** when building any UI.
10. **Commit messages:** `feat(mobile/payments): add signature capture` — use conventional commits with scope.

### Things to ASK before doing
- Adding a new package
- Changing the state management approach
- Modifying the offline sync strategy
- Adding a new top-level feature folder

### Things you can do without asking
- Creating new screens within an existing feature
- Adding tests
- Refactoring for clarity
- Fixing linter warnings
- Adding documentation comments

---

## FIRST TASKS (Start Here)

When I say "begin", do these in order:

1. Initialize Flutter project: `flutter create . --org com.ispsaas --platforms android,ios`
2. Add all dependencies from the tech stack above to `pubspec.yaml`
3. Create the folder structure exactly as specified
4. Set up `analysis_options.yaml` with strict linting
5. Configure flavors (dev/staging/production) with separate `main_<flavor>.dart` files
6. Set up theme (light + dark, Cairo font for Arabic, Inter for Latin)
7. Set up `go_router` with placeholder routes for all screens
8. Set up `flutter_localizations` with `.arb` files for en/ar/fr (placeholder strings)
9. Set up Drift database with empty tables matching backend schema (customers, invoices, payments, assignments)
10. Build login screen with phone+password form, mock API call, navigate to home placeholder
11. Show me the project structure, run `flutter run`, and STOP. I'll review then we move to the assignments list.

---

## REFERENCE FILES

- Project plan: `../docs/project-plan.md`
- Backend API: `../backend/` (read `routes/api.php` to know available endpoints)
- Project status: `../STATUS.md`

---

**End of mobile prompt. Say "begin" to start with Task 1.**
