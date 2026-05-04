import "server-only";
import { apiFetch } from "@/lib/api";

export type TwoFactorStatus = {
  enabled: boolean;
  confirmed_at: string | null;
};

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const res = await apiFetch<{ data: TwoFactorStatus }>("/api/v1/auth/2fa");
  return res.data;
}

export type EnrollPayload = {
  secret: string;
  otpauth_url: string;
  qr_svg: string;
};

export async function enrollTwoFactor(): Promise<EnrollPayload> {
  const res = await apiFetch<{ data: EnrollPayload }>(
    "/api/v1/auth/2fa/enroll",
    { method: "POST" },
  );
  return res.data;
}

export async function confirmTwoFactor(
  code: string,
): Promise<{ enabled: boolean; recovery_codes: string[] }> {
  const res = await apiFetch<{
    data: { enabled: boolean; recovery_codes: string[] };
  }>("/api/v1/auth/2fa/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  return res.data;
}

export async function disableTwoFactor(): Promise<void> {
  await apiFetch("/api/v1/auth/2fa/disable", { method: "POST" });
}
