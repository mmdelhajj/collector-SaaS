import "server-only";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "isp_auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}`);
  }
}

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

type RequestOptions = RequestInit & {
  /** When false, skip attaching the bearer token even if present in cookies. */
  authenticated?: boolean;
  /**
   * Cache the response for N seconds in Next's Data Cache. Default = no
   * cache (every render hits Laravel). Use sparingly: only for rarely-
   * changing data the page renders from (e.g. /auth/me, lookup tables).
   * Mutations (POST/PATCH/DELETE) bypass this and always go uncached.
   */
  revalidate?: number;
};

export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { authenticated = true, headers, revalidate, ...rest } = opts;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("Accept", "application/json");
  // Don't force JSON Content-Type when the body is FormData — fetch must
  // set it itself so the multipart boundary parameter is included.
  const isFormData =
    typeof FormData !== "undefined" && rest.body instanceof FormData;
  if (rest.body && !isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE)?.value;
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  // Mutations must never hit the data cache (a stale POST response would
  // be a real bug). Anything else with `revalidate` set opts in to a TTL'd
  // cache — keyed by URL + method + Authorization, so it's per-user.
  const method = (rest.method ?? "GET").toUpperCase();
  const isMutation = ["POST", "PATCH", "PUT", "DELETE"].includes(method);
  const useCache = !isMutation && typeof revalidate === "number";

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    ...(useCache
      ? { next: { revalidate } }
      : { cache: "no-store" as RequestCache }),
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new ApiError(res.status, body);
  }

  // 204 No Content (and similar empty responses) have no JSON body — calling
  // res.json() on them throws. Return undefined cast to T so the caller's
  // typing stays clean (most call sites that hit a 204 declare T as void).
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

/**
 * Like apiFetch but returns the raw Response so the caller can stream bytes
 * (e.g. avatar image proxying through a Next route handler).
 */
export async function apiFetchRaw(
  path: string,
  opts: RequestOptions = {},
): Promise<Response> {
  const { authenticated = true, headers, ...rest } = opts;
  const finalHeaders = new Headers(headers);

  if (authenticated) {
    const jar = await cookies();
    const token = jar.get(AUTH_COOKIE)?.value;
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  return fetch(url, {
    ...rest,
    headers: finalHeaders,
    cache: "no-store",
  });
}
