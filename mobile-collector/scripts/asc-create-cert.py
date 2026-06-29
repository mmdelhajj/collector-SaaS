#!/usr/bin/env python3
"""Create an Apple Distribution certificate via the App Store Connect API.

Workaround for the case where xcodebuild's "Cloud signing" rejects API key
based cert creation (only the Account Holder can use cloud signing). This
script POSTs a CSR directly to /v1/certificates with type=DISTRIBUTION,
which works for any App Manager+ key.

Outputs:
  <out>/distribution.key — RSA private key (PEM)
  <out>/distribution.cer — cert from Apple (DER)
  <out>/distribution.pem — cert (PEM)
  <out>/distribution.p12 — PKCS#12 bundle suitable for codesign

Usage:
  ASC_KEY_ID=...
  ASC_ISSUER_ID=...
  ASC_P12_PASS=...
  ASC_TEAM_ID=...           (e.g. XBFQG26XPT — only used for the cert subject)
  python3 scripts/asc-create-cert.py [out_dir]
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


def main():
    key_id = os.environ["ASC_KEY_ID"]
    issuer_id = os.environ["ASC_ISSUER_ID"]
    p12_pass = os.environ["ASC_P12_PASS"]
    team_id = os.environ.get("ASC_TEAM_ID", "")

    p8_path = os.path.expanduser(
        f"~/.appstoreconnect/private_keys/AuthKey_{key_id}.p8"
    )
    out = sys.argv[1] if len(sys.argv) > 1 else "."
    os.makedirs(out, exist_ok=True)
    key_path = os.path.join(out, "distribution.key")
    csr_path = os.path.join(out, "distribution.csr")
    cer_path = os.path.join(out, "distribution.cer")
    pem_path = os.path.join(out, "distribution.pem")
    p12_path = os.path.join(out, "distribution.p12")

    subprocess.run(["openssl", "genrsa", "-out", key_path, "2048"], check=True)
    subprocess.run(
        ["openssl", "req", "-new", "-key", key_path, "-out", csr_path,
         "-subj", f"/CN=Apple Distribution/O={team_id or 'Owner'}/C=US"],
        check=True,
    )

    with open(csr_path, "rb") as f:
        csr_pem = f.read()
    csr_body = b"".join(
        line for line in csr_pem.split(b"\n")
        if line and not line.startswith(b"-----")
    ).decode()

    payload = {"data": {"type": "certificates", "attributes": {
        "csrContent": csr_body, "certificateType": "DISTRIBUTION"}}}
    jwt = make_jwt(p8_path, key_id, issuer_id)
    req = urllib.request.Request(
        "https://api.appstoreconnect.apple.com/v1/certificates",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {jwt}",
                 "Content-Type": "application/json"},
        method="POST",
    )
    try:
        body = json.loads(urllib.request.urlopen(req).read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)

    cer_b64 = body["data"]["attributes"]["certificateContent"]
    with open(cer_path, "wb") as f:
        f.write(base64.b64decode(cer_b64))
    subprocess.run(
        ["openssl", "x509", "-in", cer_path, "-inform", "DER",
         "-out", pem_path, "-outform", "PEM"], check=True,
    )
    subprocess.run([
        "openssl", "pkcs12", "-export",
        "-inkey", key_path, "-in", pem_path,
        "-out", p12_path, "-name", "Apple Distribution",
        "-passout", f"pass:{p12_pass}",
    ], check=True)
    print(f"Cert ID:   {body['data']['id']}")
    print(f"P12:       {p12_path}")
    print(f"Subject:   {body['data']['attributes'].get('displayName')}")
    print(f"Expires:   {body['data']['attributes'].get('expirationDate')}")


if __name__ == "__main__":
    main()
