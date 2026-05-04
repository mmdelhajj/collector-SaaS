import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Crown, UserCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { AvatarSection } from "@/components/profile/avatar-section";
import { PasswordForm } from "@/components/profile/password-form";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "My profile · Super-admin" };

export default async function SuperAdminProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <UserCircle2 className="size-6 text-primary" />
          My profile
        </h1>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300">
            <Crown className="size-3" />
            Platform super-admin
          </span>
          Personal info, password, and profile photo.
        </p>
      </div>

      <AvatarSection
        initialHasAvatar={user.has_avatar}
        initialVersion={user.avatar_version}
        name={user.name}
      />

      <ProfileForm
        initial={{
          name: user.name,
          email: user.email,
          phone: user.phone,
          locale: user.locale,
          timezone: user.timezone,
        }}
      />

      <PasswordForm />
    </div>
  );
}
