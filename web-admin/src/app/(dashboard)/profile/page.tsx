import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { AvatarSection } from "@/components/profile/avatar-section";
import { PasswordForm } from "@/components/profile/password-form";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = { title: "Profile · Settings" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <UserCircle2 className="size-6 text-primary" />
          My profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
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
