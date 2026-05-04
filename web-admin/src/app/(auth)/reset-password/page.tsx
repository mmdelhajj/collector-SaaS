import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Set new password",
  description: "Choose a new password for your account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const sp = await searchParams;
  const email = sp.email ?? "";
  const token = sp.token ?? "";

  return (
    <div className="relative z-10 w-full max-w-[420px]">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 space-y-1.5">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a password you haven&rsquo;t used here before.
          </p>
        </div>

        <ResetPasswordForm email={email} token={token} />
      </div>
    </div>
  );
}
