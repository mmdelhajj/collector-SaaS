#!/usr/bin/env bash
# Build and upload an iOS release to TestFlight.
#
# Why this script exists: standard `flutter build ipa --export-options-plist`
# requires the signed-in Apple ID in Xcode to be a member of the team that
# owns the bundle ID. In this project the App Store Connect API key has
# access to team XBFQG26XPT but the local Apple ID is on a different team,
# so xcodebuild's exportArchive refuses. We work around it by signing the
# .app manually with the Apple Distribution cert in a throwaway keychain
# and packing the IPA ourselves, then uploading via altool.
#
# Required environment variables:
#   ASC_KEY_ID         App Store Connect API Key ID (e.g. 7CRCPJBZVJ)
#   ASC_ISSUER_ID      Issuer ID (UUID, same for the whole account)
#   ASC_TEAM_ID        Apple Developer team ID (e.g. XBFQG26XPT)
#   ASC_BUNDLE_ID      App bundle ID (e.g. com.runcollect.ispCollector)
#   ASC_DIST_P12       Path to the Apple Distribution cert in PKCS#12 form
#   ASC_DIST_P12_PASS  Password for the .p12 file
#   ASC_PROFILE_UUID   App Store provisioning profile UUID (mobileprovision
#                      filename without the extension)
#
# Optional:
#   API_BASE_URL       Defaults to https://runcollect.com
#
# The .p8 must live at ~/.appstoreconnect/private_keys/AuthKey_<KEY>.p8
# (altool's standard location).

set -euo pipefail
cd "$(dirname "$0")/.."

: "${ASC_KEY_ID:?missing}"
: "${ASC_ISSUER_ID:?missing}"
: "${ASC_TEAM_ID:?missing}"
: "${ASC_BUNDLE_ID:?missing}"
: "${ASC_DIST_P12:?missing}"
: "${ASC_DIST_P12_PASS:?missing}"
: "${ASC_PROFILE_UUID:?missing}"

API_BASE_URL="${API_BASE_URL:-https://runcollect.com}"
FLUTTER="${FLUTTER:-/Users/mes/development/flutter/bin/flutter}"
PROFILE_PATH="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/${ASC_PROFILE_UUID}.mobileprovision"

[[ -f "$PROFILE_PATH" ]] || {
    echo "Provisioning profile not found at: $PROFILE_PATH"
    echo "Use scripts/asc-create-profile.py to generate one."
    exit 1
}

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
KC="$WORK/sign.keychain-db"
IDENT="Apple Distribution"  # codesign matches by name prefix

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

echo "==> Create temp keychain + import distribution cert"
security create-keychain -p tmp "$KC"
security unlock-keychain -p tmp "$KC"
security set-keychain-settings -t 7200 "$KC"
ORIG_LIST=$(security list-keychains -d user | tr -d '"' | xargs)
security list-keychains -d user -s "$KC" $ORIG_LIST
trap 'rm -rf "$WORK"; security list-keychains -d user -s '"$ORIG_LIST"'' EXIT
security import "$ASC_DIST_P12" -k "$KC" -P "$ASC_DIST_P12_PASS" -A

echo "==> Sign frameworks"
APP="$WORK/Payload/Runner.app"
for f in "$APP"/Frameworks/*.framework; do
    codesign --force --sign "$IDENT" --keychain "$KC" "$f"
done

echo "==> Sign app"
codesign --force --sign "$IDENT" --keychain "$KC" \
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
