import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { makeTranslator } from "@/lib/i18n";
import { readLocale } from "@/lib/locale-cookie";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your RunCollect workspace.",
};

export default async function LoginPage() {
  const locale = await readLocale();
  const t = makeTranslator(locale);
  return (
    <div className="relative z-10 w-full max-w-[420px]">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>

      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6 space-y-1.5">
          <h1 className="text-pretty text-2xl font-semibold tracking-tight">
            {t("auth.welcomeBack")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.signInDescription")}
          </p>
        </div>

        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t("auth.needAccess")}
      </p>
    </div>
  );
}
