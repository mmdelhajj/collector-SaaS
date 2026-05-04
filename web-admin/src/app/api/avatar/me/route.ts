import { apiFetchRaw } from "@/lib/api";

/**
 * Proxy the authenticated user's avatar bytes from the Laravel API back to
 * the browser. The browser can't reach the Laravel host directly (it's
 * 127.0.0.1 inside the dev environment), so we serve the image from the
 * same origin as the Next app and forward auth via the existing cookie.
 */
export async function GET(): Promise<Response> {
  const upstream = await apiFetchRaw("/api/v1/auth/avatar");

  if (!upstream.ok) {
    return new Response(null, { status: upstream.status });
  }

  const headers = new Headers();
  const ct = upstream.headers.get("Content-Type");
  if (ct) headers.set("Content-Type", ct);
  // Short cache so the browser caches between page navigations but a new
  // ?v= cache-buster (from has_avatar/avatar_version) forces a refresh.
  headers.set("Cache-Control", "private, max-age=60");

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
