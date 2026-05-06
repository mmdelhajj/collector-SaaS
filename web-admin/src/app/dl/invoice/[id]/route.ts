import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/api";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8000";

/**
 * Proxies invoice PDF downloads from Laravel.
 *
 * The browser doesn't have access to the bearer token (it's in an httpOnly
 * cookie), so it can't hit the Laravel endpoint directly. This handler reads
 * the cookie server-side, attaches Authorization, and streams the PDF body
 * back through Next so the browser receives it as if it came from us.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // UUID format check — if `id` were ever passed unsanitized into the
  // upstream URL, encoded slashes (..%2F..) could in theory navigate to
  // a different Laravel route. Belt-and-braces: enforce shape here.
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return new Response("Bad request", { status: 400 });
  }

  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const upstream = await fetch(`${API_BASE_URL}/api/v1/invoices/${id}/pdf`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/pdf",
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new Response(`Upstream error ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") ?? "application/pdf",
  );
  // Always force a download. The upstream Laravel response uses
  // Pdf::stream() which sends `inline`, so we override here. Use the
  // invoice number as filename when DomPDF includes it; otherwise fall
  // back to the UUID.
  const upstreamCd = upstream.headers.get("Content-Disposition") ?? "";
  const nameMatch = upstreamCd.match(/filename="?([^";]+)"?/i);
  const filename = nameMatch?.[1] ?? `invoice-${id}.pdf`;
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);

  return new Response(upstream.body, {
    status: 200,
    headers,
  });
}
