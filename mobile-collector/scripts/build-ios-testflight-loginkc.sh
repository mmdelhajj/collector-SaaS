#!/usr/bin/env bash
# Variant of build-ios-testflight.sh that signs directly from login keychain
# instead of importing a .p12 into a throwaway keychain. Use this when the
# Distribution cert lives in the login keychain but the .p12 export is
# blocked (forgotten keychain password / GUI prompt issues).
#
# Required env vars: same as original MINUS ASC_DIST_P12 / ASC_DIST_P12_PASS,
# plus ASC_SIGN_IDENTITY (the cert SHA1 from `security find-identity`).

set -euo pipefail
cd "$(dirname "$0")/.."

: "${ASC_KEY_ID:?missing}"
: "${ASC_ISSUER_ID:?missing}"
: "${ASC_TEAM_ID:?missing}"
: "${ASC_BUNDLE_ID:?missing}"
: "${ASC_PROFILE_UUID:?missing}"
: "${ASC_SIGN_IDENTITY:?missing — pass cert SHA1, e.g. B3A57C6A514260D5418230040A58FFF26B167E2B}"

API_BASE_URL="${API_BASE_URL:-https://runcollect.com}"
FLUTTER="${FLUTTER:-/Users/mes/development/flutter/bin/flutter}"
PROFILE_PATH="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/${ASC_PROFILE_UUID}.mobileprovision"

[[ -f "$PROFILE_PATH" ]] || {
    echo "Provisioning profile not found at: $PROFILE_PATH"
    exit 1
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "==> Verify signing identity is present in login keychain"
security find-identity -v -p codesigning ~/Library/Keychains/login.keychain-db \
    | grep -q "$ASC_SIGN_IDENTITY" || {
    echo "Identity $ASC_SIGN_IDENTITY not found in login keychain."
    exit 1
}

echo "==> Build Flutter iOS bundle (no codesign)"
"$FLUTTER" build ios --release --no-codesign \
    --dart-define=API_BASE_URL="$API_BASE_URL"

echo "==> Stage Runner.app + embed provisioning profile"
mkdir -p "$WORK/Payload"
cp -R build/ios/iphoneos/Runner.app "$WORK/Payload/"
cp "$PROFILE_PATH" "$WORK/Payload/Runner.app/embedded.mobileprovision"

echo "==> Extract entitlements from profile"
security cms -D -i "$PROFILE_PATH" -o "$WORK/profile-plist.xml"
plutil -extract Entitlements xml1 -o "$WORK/entitlements.plist" "$WORK/profile-plist.xml"

APP="$WORK/Payload/Runner.app"

echo "==> Sign frameworks"
for f in "$APP"/Frameworks/*.framework; do
    codesign --force --sign "$ASC_SIGN_IDENTITY" "$f"
done

echo "==> Sign app"
codesign --force --sign "$ASC_SIGN_IDENTITY" \
    --entitlements "$WORK/entitlements.plist" "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

echo "==> Pack IPA"
IPA="$WORK/Runner.ipa"
( cd "$WORK" && zip -qr "$IPA" Payload )

echo "==> Validate via App Store Connect"
xcrun altool --validate-app -f "$IPA" --type ios \
    --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "==> Upload to TestFlight"
xcrun altool --upload-app -f "$IPA" --type ios \
    --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"

echo "==> Done. Apple is processing — TestFlight emails in 5–15 min."
