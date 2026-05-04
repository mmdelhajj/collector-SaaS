import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Short-lived encrypted server cookie used to keep the user's plaintext
 * password OUT of the client-visible action state during a 2FA login
 * challenge.
 *
 * Pre-fix flow: server returned `{ email, password, needsTwoFactor }` to the
 * action state. Next serializes that into the RSC payload, so the password
 * was visible in the browser network tab.
 *
 * Post-fix flow: server stores `{ email, password, exp }` in an httpOnly
 * AES-256-GCM-encrypted cookie scoped to /login, returns only a flag.
 * The 2FA-code submission action reads the cookie, decrypts, retries
 * login. Cookie expires after 5 minutes and is cleared on success/abort.
 */

const COOKIE_NAME = "isp_2fa_challenge";
const COOKIE_PATH = "/login";
const TTL_SECONDS = 300;

type Challenge = {
  email: string;
  password: string;
  // ms since epoch — cheap defence in depth in case the cookie's own
  // maxAge is honoured loosely by some proxy.
  exp: number;
};

/**
 * Derive a 32-byte key from process env. Prefers TWO_FACTOR_CHALLENGE_KEY
 * (a 32+ char random hex string) but falls back to a hash of NODE_ENV +
 * AUTH_COOKIE_SECURE so dev works without configuration. Production MUST
 * set TWO_FACTOR_CHALLENGE_KEY explicitly — we throw if it's the dev
 * fallback in a Secure-cookie environment.
 */
function getKey(): Buffer {
  const explicit = process.env.TWO_FACTOR_CHALLENGE_KEY;
  if (explicit && explicit.length >= 32) {
    return crypto.createHash("sha256").update(explicit).digest();
  }
  if (process.env.AUTH_COOKIE_SECURE === "true") {
    throw new Error(
      "TWO_FACTOR_CHALLENGE_KEY must be set (32+ chars) in production",
    );
  }
  // Dev fallback — deterministic, scoped to dev mode only.
  return crypto
    .createHash("sha256")
    .update(`dev-fallback-${process.env.NODE_ENV ?? "development"}`)
    .digest();
}

export async function setChallenge(input: {
  email: string;
  password: string;
}): Promise<void> {
  const payload: Challenge = {
    email: input.email,
    password: input.password,
    exp: Date.now() + TTL_SECONDS * 1000,
  };
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Layout: iv(12) || tag(16) || ciphertext, base64url-encoded.
  const blob = Buffer.concat([iv, tag, enc]).toString("base64url");

  const jar = await cookies();
  jar.set(COOKIE_NAME, blob, {
    httpOnly: true,
    secure: process.env.AUTH_COOKIE_SECURE === "true",
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: TTL_SECONDS,
  });
}

export async function readChallenge(): Promise<Challenge | null> {
  const jar = await cookies();
  const blob = jar.get(COOKIE_NAME)?.value;
  if (!blob) return null;
  try {
    const buf = Buffer.from(blob, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const key = getKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const json = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(json) as Challenge;
    if (Date.now() > parsed.exp) {
      // Self-cleanup of an expired cookie so the user doesn't keep retrying.
      await clearChallenge();
      return null;
    }
    return parsed;
  } catch {
    // Corrupted or wrong-key — treat as no challenge.
    return null;
  }
}

export async function clearChallenge(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: COOKIE_NAME, path: COOKIE_PATH });
}
