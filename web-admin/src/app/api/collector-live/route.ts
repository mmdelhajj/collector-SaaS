import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";

export type LiveCollector = {
  collector: { id: number | null; name: string };
  latitude: number;
  longitude: number;
  last_ping_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  is_active: boolean;
  total_collected: number;
};

export async function GET() {
  try {
    const res = await apiFetch<{ data: LiveCollector[] }>(
      "/api/v1/collector-live",
    );
    return NextResponse.json(res);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return NextResponse.json({ data: [] }, { status });
  }
}
