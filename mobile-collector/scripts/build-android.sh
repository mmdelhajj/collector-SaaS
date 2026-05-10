#!/usr/bin/env bash
# Build a release APK + AAB for the collector app, hardcoded to runcollect.com.
# Both artifacts are dropped into build/app/outputs at the end.
set -euo pipefail

cd "$(dirname "$0")/.."

FLUTTER="${FLUTTER:-/Users/mes/development/flutter/bin/flutter}"
API_BASE_URL="${API_BASE_URL:-https://runcollect.com}"

echo "==> flutter pub get"
"$FLUTTER" pub get

echo "==> flutter build apk --release"
"$FLUTTER" build apk --release \
    --dart-define=API_BASE_URL="$API_BASE_URL"

echo "==> flutter build appbundle --release"
"$FLUTTER" build appbundle --release \
    --dart-define=API_BASE_URL="$API_BASE_URL"

APK="$(pwd)/build/app/outputs/flutter-apk/app-release.apk"
AAB="$(pwd)/build/app/outputs/bundle/release/app-release.aab"

echo
echo "==> Done."
echo "    APK (sideload onto a phone):   $APK"
echo "    AAB (upload to Play Console):  $AAB"
echo
if [[ ! -f android/key.properties ]]; then
    echo "WARNING: android/key.properties not found — your APK is signed with"
    echo "the debug key. That's fine for testing on your own phone, but the"
    echo "Play Store will reject it. Run scripts/setup-android-signing.sh"
    echo "first to set up release signing."
fi
