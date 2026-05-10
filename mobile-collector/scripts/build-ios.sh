#!/usr/bin/env bash
# Build a signed IPA and (optionally) upload it to TestFlight.
#
# One-time prerequisites:
#  1. Apple Developer Program membership ($99/yr) — already paid if you have a
#     "Apple Development" cert in your keychain.
#  2. App record in App Store Connect with bundle ID com.runcollect.ispCollector.
#  3. Open ios/Runner.xcworkspace in Xcode → Runner target → Signing &
#     Capabilities → tick "Automatically manage signing" → pick your Team.
#     Xcode will create a Distribution cert + provisioning profile for you.
#  4. App Store Connect API key (for unattended uploads):
#     App Store Connect → Users and Access → Integrations → App Store Connect
#     API → "+" → Create. Download the .p8 file and note the Key ID + Issuer ID.
#     Place the .p8 at ~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8.
#     Then export ASC_KEY_ID and ASC_ISSUER_ID before running with --upload.
#
# Usage:
#   scripts/build-ios.sh             # build IPA only
#   scripts/build-ios.sh --upload    # build + upload to TestFlight
set -euo pipefail

cd "$(dirname "$0")/.."

FLUTTER="${FLUTTER:-/Users/mes/development/flutter/bin/flutter}"
API_BASE_URL="${API_BASE_URL:-https://runcollect.com}"
DO_UPLOAD=false

for arg in "$@"; do
    case "$arg" in
        --upload) DO_UPLOAD=true ;;
        *) echo "Unknown arg: $arg" >&2; exit 2 ;;
    esac
done

echo "==> flutter pub get"
"$FLUTTER" pub get

echo "==> pod install"
( cd ios && pod install )

echo "==> flutter build ipa --release (this takes a few minutes)"
"$FLUTTER" build ipa --release \
    --dart-define=API_BASE_URL="$API_BASE_URL"

IPA="$(ls -1 build/ios/ipa/*.ipa 2>/dev/null | head -1 || true)"
if [[ -z "$IPA" ]]; then
    echo "Build didn't produce an IPA. Open build/ios/archive/*.xcarchive in"
    echo "Xcode (Window → Organizer) to see signing errors." >&2
    exit 1
fi

echo
echo "==> IPA built: $IPA"
echo

if [[ "$DO_UPLOAD" != true ]]; then
    echo "Skipping upload. Re-run with --upload to push to TestFlight, or"
    echo "open Xcode → Window → Organizer to upload manually."
    exit 0
fi

: "${ASC_KEY_ID:?Set ASC_KEY_ID (App Store Connect API Key ID)}"
: "${ASC_ISSUER_ID:?Set ASC_ISSUER_ID (App Store Connect Issuer ID)}"

echo "==> Validating IPA against App Store Connect"
xcrun altool --validate-app -f "$IPA" --type ios \
    --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "==> Uploading to App Store Connect"
xcrun altool --upload-app -f "$IPA" --type ios \
    --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo
echo "==> Uploaded. Apple is now processing the build (5–15 min)."
echo "    Once processing finishes, TestFlight emails your testers."
