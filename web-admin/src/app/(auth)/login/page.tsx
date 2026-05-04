import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your ISP SaaS workspace.",
};

export default function LoginPage() {
  return (
    <div className="relative z-10 w-full max-w-[420px]">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 space-y-1.5">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to your workspace to manage customers, invoices, and
            collectors.
          </p>
        </div>

        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Need access? Ask your workspace admin to invite you.
      </p>
    </div>
  );
}
