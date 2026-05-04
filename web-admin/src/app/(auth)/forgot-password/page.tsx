import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your password via email.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative z-10 w-full max-w-[420px]">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 space-y-1.5">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email and we&rsquo;ll send you a link to set a new
            password.
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
