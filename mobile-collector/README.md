# ISP Collector — Mobile (Flutter)

Field-collector app: collectors see today's assignments, navigate to the
customer, record cash payments, and the system sends a WhatsApp/SMS receipt
automatically.

## Status

This is a **scaffold**. The repo contains the app skeleton — Riverpod state,
go_router routing, Dio API client with auth interceptor, three core screens
(login → assignments → record-payment), and full pubspec.yaml with the
selected dependency tree.

To get it running you need a local Flutter SDK (the dev server doesn't have
one). Follow the setup steps below on a machine with Flutter installed.

## Quickstart

```bash
# Install Flutter ≥ 3.22 (https://docs.flutter.dev/get-started/install)
flutter --version

# Get deps
cd mobile-collector
flutter pub get

# Point at your API. For Android emulator (uses 10.0.2.2 to reach host):
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000

# For a physical device on the same Wi-Fi:
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:8000

# Production build:
flutter build apk --release \
    --dart-define=API_BASE_URL=https://api.your-domain.com
```

Demo login (against the seeded backend):
- Email: any user with role `collector` (e.g. seeded collectors at demoisp.com)
- Password: `password`

## Roadmap (post-scaffold)

These weren't built tonight — wire them in next:

- [ ] **Offline mode**: persist assignments + queued payments in Drift, sync
      via Workmanager when network returns. The pubspec already has both deps.
- [ ] **GPS ping**: background timer hitting `POST /collector/ping` every
      30 seconds while a route is active. Backend endpoint is live.
- [ ] **Live route map**: integrate `flutter_map` to show assigned customers
      on a route view, with a "navigate" button that opens the OS map app.
- [ ] **Photo + signature** on payment screen — `image_picker` and `signature`
      packages are in pubspec but not wired into the form yet.
- [ ] **Cash handover flow**: end-of-day screen that bundles unhandover'd
      payments and submits to `/collector/handover-cash`.
- [ ] **Localization**: copy the `web-admin/src/messages/*.json` strings into
      a Flutter `intl` arb file and wire `MaterialApp.supportedLocales`.
- [ ] **2FA challenge**: the login screen handles the `two_factor_required`
      response but doesn't yet handle recovery codes — add that toggle.
- [ ] **Push notifications**: Firebase Cloud Messaging for new assignments
      and supervisor disputes.

## Architecture

```
lib/
├── main.dart                          # Entry — wraps app in ProviderScope
├── core/
│   ├── config.dart                    # AppConfig.apiBaseUrl (build-time)
│   ├── auth_storage.dart              # Secure token storage (Keychain/Keystore)
│   ├── api_client.dart                # Dio with auth interceptor
│   └── router.dart                    # GoRouter + auth guard
├── features/
│   ├── auth/login_screen.dart         # Email + password + 2FA challenge
│   ├── assignments/assignments_screen.dart  # Today's list, refreshable
│   └── payments/record_payment_screen.dart  # Amount + method + GPS, geofenced
└── (...)
```

State is Riverpod via `@riverpod` annotation (codegen runs via build_runner).
Run `dart run build_runner build` after editing any annotated provider.

## Backend coupling

The app expects the Laravel API to expose:
- `POST /api/v1/auth/login` — returns `{ user, token, expires_at }`
- `GET /api/v1/collector/my-assignments` — paginated list, today
- `POST /api/v1/payments` — records a payment, triggers receipt + reactivation
- `POST /api/v1/collector/ping` — GPS heartbeat
- `POST /api/v1/collector/handover-cash` — end of day cash drop

All exist server-side already.
