import { NextResponse } from "next/server";
import { listCustomers } from "@/lib/customers";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";

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
