import "server-only";
import { apiFetch } from "@/lib/api";

export type PublicPlan = {
  code: "starter" | "growth" | "pro";
  name: string;
  description: string | null;
  price_monthly: number;
  price_annual: number | null;
  limits: {
    customers: number | null;
    users: number | null;
    collectors: number | null;
  };
  features: {
    radius: boolean;
    whatsapp: boolean;
    sms: boolean;
    priority_support: boolean;
  };
};

export async function listPublicPlans(): Promise<PublicPlan[]> {
  const res = await apiFetch<{ data: PublicPlan[] }>("/api/v1/plans", {
    authenticated: false,
  });
  return res.data;
}
