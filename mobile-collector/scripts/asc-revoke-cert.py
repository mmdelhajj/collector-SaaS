#!/usr/bin/env python3
"""List or revoke Apple certificates via the App Store Connect API.

Apple enforces "1 active DISTRIBUTION cert per team". When the local private
key is lost, the cert is useless to us but still occupies the slot, so
asc-create-cert.py returns HTTP 409. Use this to free the slot.

Usage:
  ASC_KEY_ID=... ASC_ISSUER_ID=... python3 scripts/asc-revoke-cert.py list
  ASC_KEY_ID=... ASC_ISSUER_ID=... python3 scripts/asc-revoke-cert.py revoke <cert_id>
  ASC_KEY_ID=... ASC_ISSUER_ID=... python3 scripts/asc-revoke-cert.py revoke-dist
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
    # Parse DER ECDSA sig (SEQ{ INTEGER r, INTEGER s }) into raw r||s.
    assert der_sig[0] == 0x30
    i = 2
    if der_sig[1] & 0x80:
        i = 2 + (der_sig[1] & 0x7F)
    assert der_sig[i] == 0x02
    rlen = der_sig[i + 1]
    r = der_sig[i + 2:i + 2 + rlen]
    j = i + 2 + rlen
    assert der_sig[j] == 0x02
    slen = der_sig[j + 1]
    s = der_sig[j + 2:j + 2 + slen]
    r = r.rjust(32, b"\x00")[-32:]
    s = s.rjust(32, b"\x00")[-32:]
    return f"{signing_input}.{b64url(r + s)}"


def api(method, path, jwt):
    req = urllib.request.Request(
        f"https://api.appstoreconnect.apple.com{path}",
        headers={"Authorization": f"Bearer {jwt}"},
        method=method,
    )
    try:
        resp = urllib.request.urlopen(req)
        raw = resp.read()
        return resp.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        return e.code, {"error": e.read().decode()}


def main():
    key_id = os.environ["ASC_KEY_ID"]
    issuer_id = os.environ["ASC_ISSUER_ID"]
    p8_path = os.path.expanduser(
        f"~/.appstoreconnect/private_keys/AuthKey_{key_id}.p8"
    )
    jwt = make_jwt(p8_path, key_id, issuer_id)
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"

    _, body = api("GET", "/v1/certificates?limit=200", jwt)
    certs = body.get("data", [])

    if cmd == "list":
        for c in certs:
            a = c["attributes"]
            print(f"{c['id']}  {a.get('certificateType'):20} "
                  f"{a.get('displayName')}  exp={a.get('expirationDate')}")
        return

    if cmd == "revoke":
        cert_id = sys.argv[2]
        status, resp = api("DELETE", f"/v1/certificates/{cert_id}", jwt)
        print(f"revoke {cert_id}: HTTP {status} {resp or 'OK'}")
        return

    if cmd == "revoke-dist":
        targets = [c for c in certs
                   if c["attributes"].get("certificateType") == "DISTRIBUTION"]
        if not targets:
            print("No DISTRIBUTION certs to revoke.")
            return
        for c in targets:
            status, resp = api("DELETE", f"/v1/certificates/{c['id']}", jwt)
            print(f"revoke {c['id']} "
                  f"({c['attributes'].get('displayName')}): "
                  f"HTTP {status} {resp or 'OK'}")
        return

    print(f"Unknown command: {cmd}", file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
