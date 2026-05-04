import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/api";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

/**
 * Proxies the CSV export from Laravel, attaching the bearer token from the
 * httpOnly cookie. The browser receives a regular file download.
 */
// Allowlist of report types we proxy. Without this, a misspelt `?type=foo`
// would silently reach Laravel and surface a 4xx — easier to fail fast and
// also prevent any future Laravel-side type-dispatch bug from being reached
// via a hand-crafted query.
const ALLOWED_TYPES = new Set([
  "aging",
  "revenue",
  "collector-performance",
  "payments",
  "invoices",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "aging";

  if (!ALLOWED_TYPES.has(type)) {
    return new Response("Unknown report type", { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const upstream = await fetch(
    `${API_BASE_URL}/api/v1/reports/export?type=${encodeURIComponent(type)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/csv",
      },
      cache: "no-store",
    },
  );

  if (!upstream.ok) {
    return new Response(`Upstream error ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", "text/csv; charset=utf-8");
  const cd = upstream.headers.get("Content-Disposition");
  headers.set(
    "Content-Disposition",
    cd ?? `attachment; filename="report-${type}.csv"`,
  );

  return new Response(upstream.body, { status: 200, headers });
}
