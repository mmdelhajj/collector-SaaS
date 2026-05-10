#!/usr/bin/env bash
# One-shot setup for Android release signing. Generates an upload keystore in
# ~/development/keystores/ and writes android/key.properties pointing at it.
# Run once. Re-running aborts so you don't accidentally overwrite a keystore
# that's already been used to sign uploads.
set -euo pipefail

KEYS_DIR="$HOME/development/keystores"
KEYSTORE="$KEYS_DIR/runcollect-collector-release.jks"
PROPS="$(cd "$(dirname "$0")/.." && pwd)/android/key.properties"

if [[ -f "$KEYSTORE" ]]; then
    echo "Keystore already exists at $KEYSTORE — refusing to overwrite."
    echo "If you really want a new one, move/rename the existing file first."
    exit 1
fi
if [[ -f "$PROPS" ]]; then
    echo "android/key.properties already exists — refusing to overwrite."
    exit 1
fi

mkdir -p "$KEYS_DIR"

echo "==> Generating upload keystore at $KEYSTORE"
echo "    You'll be prompted for two passwords (use the same one for both)"
echo "    and your name/org details. Keep the passwords safe — losing them"
echo "    means you can never push an update to the Play Store."
read -rsp "Keystore password (will be reused for the key): " PW
echo

keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias upload \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PW" -keypass "$PW" \
    -dname "CN=RunCollect, O=RunCollect, C=LB"

cat > "$PROPS" <<EOF
storeFile=$KEYSTORE
storePassword=$PW
keyAlias=upload
keyPassword=$PW
EOF
chmod 600 "$PROPS"

echo
echo "==> Done."
echo "    Keystore: $KEYSTORE"
echo "    Props:    $PROPS  (gitignored)"
echo
echo "Back up the keystore file somewhere safe (encrypted cloud drive, password"
echo "manager attachment, etc.). Without it you cannot ship updates."
