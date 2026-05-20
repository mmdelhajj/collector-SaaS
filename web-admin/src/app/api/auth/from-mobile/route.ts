import { NextRequest, NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import { setAuthCookie } from "@/lib/auth";

/**
 * Bridge endpoint that converts a mobile Sanctum bearer token into a web
 * session cookie, then redirects into the admin SPA.
 *
 * The mobile app embeds the admin in a WebView and lands at:
 *   https://runcollect.com/api/auth/from-mobile?token=<bearer>&next=/dashboard
 *
 * We validate the token by calling /auth/me with it. On success we set the
 * `isp_auth` cookie (same one a normal web login would set) and 302 the
 * browser to `next`. From that point the WebView is a regular signed-in
 * admin session — every feature works without a second login.
 *
 * Security:
 *   - The bearer token is short-lived (30-day expiry, Sanctum default).
 *   - We don't trust the `next` param blindly — only same-origin paths are
 *     allowed; anything starting with `http://`, `https://`, or `//` falls
 *     back to `/dashboard`.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const rawNext = url.searchParams.get("next") ?? "/dashboard";

  if (!token) {
    return NextResponse.json(
      { message: "Missing token" },
      { status: 400 },
    );
  }

  // Same-origin only. Block protocol-relative URLs and explicit hosts.
  let next = "/dashboard";
  if (
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.includes(":")
  ) {
    next = rawNext;
  }

  // Validate the token by calling /auth/me with it. This both proves the
  // token is real and gives us the expires_at for the cookie's lifetime.
  try {
    const me = await apiFetch<{ user: { id: number } }>("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      authenticated: false,
    });
    if (!me?.user?.id) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 },
      );
    }
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 401;
    return NextResponse.json(
      { message: "Token rejected by API" },
      { status },
    );
  }

  // Sanctum tokens don't have an extractable expiry here; use 30 days
  // (matches Sanctum's default token TTL).
  const expiresAt = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  await setAuthCookie(token, expiresAt);

  // `req.url` resolves to the internal Next.js origin (e.g. localhost:3000)
  // when we're behind Caddy, which makes the redirect un-reachable from a
  // mobile WebView. Always build the redirect against the public origin
  // — env-provided in prod (`NEXT_PUBLIC_APP_URL`), falling back to the
  // forwarded headers Caddy already trusts.
  const publicOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    (() => {
      const proto = req.headers.get("x-forwarded-proto") ?? "https";
      const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
      return host ? `${proto}://${host}` : null;
    })();

  if (!publicOrigin) {
    return NextResponse.json(
      { message: "Could not resolve public origin" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(new URL(next, publicOrigin));
}
