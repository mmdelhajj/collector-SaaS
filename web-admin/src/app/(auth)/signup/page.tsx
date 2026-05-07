import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { listPublicPlans } from "@/lib/plans-public";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Start your free trial",
  description:
    "Create your RunCollect workspace in 60 seconds. 14-day free trial, no card required.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const sp = await searchParams;
  const SIGNUP_ELIGIBLE = ["starter", "growth", "pro"] as const;
  const allPlans = await listPublicPlans().catch(() => []);
  const plans = allPlans.filter((p) =>
    (SIGNUP_ELIGIBLE as readonly string[]).includes(p.code),
  );
  const initialPlan = plans.find((p) => p.code === sp.plan)?.code ?? "growth";

  return (
    <div className="relative z-10 w-full max-w-[480px]">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 space-y-1.5">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">
            Start your free trial
          </h1>
          <p className="text-sm text-muted-foreground">
            14 days free. No card required. Cancel anytime.
          </p>
        </div>

        <SignupForm plans={plans} initialPlan={initialPlan} />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
