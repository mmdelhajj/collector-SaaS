#!/usr/bin/env python3
"""Create an App Store iOS provisioning profile via App Store Connect API.

Drops the .mobileprovision into Xcode's UserData profiles dir so that
build-ios-testflight.sh can find it by UUID.

Usage:
  ASC_KEY_ID=...
  ASC_ISSUER_ID=...
  ASC_BUNDLE_ID=com.runcollect.ispCollector
  ASC_CERT_ID=...           (the id field from asc-create-cert.py output)
  ASC_PROFILE_NAME="App Name App Store"
  python3 scripts/asc-create-profile.py
"""
import base64
import datetime
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def make_jwt(p8_path: str, key_id: str, issuer_id: str) -> str:
    header = {"alg": "ES256", "kid": key_id, "typ": "JWT"}
    now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    payload = {"iss": issuer_id, "iat": now, "exp": now + 1200,
               "aud": "appstoreconnect-v1"}
    h = b64url(json.dumps(header, separators=(",", ":")).encode())
    p = b64url(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{h}.{p}"
    der_sig = subprocess.run(
        ["openssl", "dgst", "-sha256", "-sign", p8_path, "-binary"],
        input=signing_input.encode(), capture_output=True, check=True,
    ).stdout
    asn1 = subprocess.run(
        ["openssl", "asn1parse", "-inform", "DER"],
        input=der_sig, capture_output=True, check=True,
    ).stdout.decode()
    ints = []
    for line in asn1.splitlines():
        if "INTEGER" in line and ":" in line:
            hex_str = line.split(":")[-1].strip()
            ints.append(bytes.fromhex(hex_str.lstrip("00") or "00"))
    r = ints[0].rjust(32, b"\x00")[-32:]
    s = ints[1].rjust(32, b"\x00")[-32:]
    return f"{signing_input}.{b64url(r + s)}"


def api_get(jwt: str, path: str):
    req = urllib.request.Request(
        f"https://api.appstoreconnect.apple.com{path}",
        headers={"Authorization": f"Bearer {jwt}"},
    )
    return json.loads(urllib.request.urlopen(req).read())


def api_post(jwt: str, path: str, body: dict):
    req = urllib.request.Request(
        f"https://api.appstoreconnect.apple.com{path}",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {jwt}",
                 "Content-Type": "application/json"},
        method="POST",
    )
    try:
        return json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def main():
    key_id = os.environ["ASC_KEY_ID"]
    issuer_id = os.environ["ASC_ISSUER_ID"]
    bundle_id_str = os.environ["ASC_BUNDLE_ID"]
    cert_id = os.environ["ASC_CERT_ID"]
    profile_name = os.environ["ASC_PROFILE_NAME"]

    p8_path = os.path.expanduser(
        f"~/.appstoreconnect/private_keys/AuthKey_{key_id}.p8"
    )
    jwt = make_jwt(p8_path, key_id, issuer_id)

    res = api_get(jwt, f"/v1/bundleIds?filter[identifier]={bundle_id_str}")
    if not res.get("data"):
        print(f"No bundleId for {bundle_id_str}", file=sys.stderr)
        sys.exit(1)
    bundle_id_api_id = res["data"][0]["id"]

    payload = {"data": {
        "type": "profiles",
        "attributes": {"name": profile_name, "profileType": "IOS_APP_STORE"},
        "relationships": {
            "bundleId": {"data": {"type": "bundleIds",
                                   "id": bundle_id_api_id}},
            "certificates": {"data": [{"type": "certificates",
                                        "id": cert_id}]},
        },
    }}
    res = api_post(jwt, "/v1/profiles", payload)
    profile_b64 = res["data"]["attributes"]["profileContent"]
    profile_uuid = res["data"]["attributes"]["uuid"]
    out_dir = os.path.expanduser(
        "~/Library/Developer/Xcode/UserData/Provisioning Profiles"
    )
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"{profile_uuid}.mobileprovision")
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(profile_b64))
    print(f"UUID:    {profile_uuid}")
    print(f"Path:    {out_path}")
    print(f"Export:  ASC_PROFILE_UUID={profile_uuid}")


if __name__ == "__main__":
    main()
