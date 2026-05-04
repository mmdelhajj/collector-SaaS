import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

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
  // Live GPS coordinates of every collector are sensitive — block at the
  // edge instead of returning empty data on missing auth.
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "unauthenticated" }, { status: 401 });
  }

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
