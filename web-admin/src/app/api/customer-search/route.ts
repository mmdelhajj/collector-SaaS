import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers } from "@/lib/customers";

export async function GET(request: Request) {
  // Defense-in-depth: reject unauthenticated calls at the edge so we don't
  // mask a missing-cookie bug as "no results found." Laravel will also
  // reject, but this surfaces 401s in our metrics.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "unauthenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  // Cap query length so a multi-megabyte string can't be forwarded to Laravel.
  const q = (url.searchParams.get("q") ?? "").slice(0, 200);

  try {
    const data = await listCustomers({
      search: q || undefined,
      perPage: 15,
    });
    return NextResponse.json({
      data: data.data.map((c) => ({
        id: c.id,
        code: c.code,
        full_name: c.full_name,
      })),
    });
  } catch {
    return NextResponse.json({ data: [] });
  }
}
