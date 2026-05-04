import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { listPublicPlans } from "@/lib/plans-public";
import { CreateTenantForm } from "./create-form";

export const metadata: Metadata = { title: "New tenant · Super-admin" };

export default async function NewTenantPage() {
  const plans = await listPublicPlans();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/super-admin/tenants"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          All tenants
        </Link>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Building2 className="size-6 text-primary" />
          Create a tenant
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manually provision a new workspace and the first owner user.
          You&rsquo;ll get a one-time password to share with them via a
          secure channel.
        </p>
      </div>

      <CreateTenantForm plans={plans} />
    </div>
  );
}
