import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getNotifications } from "@/lib/settings";
import { NotificationsForm } from "./notifications-form";

export const metadata: Metadata = { title: "Notifications · Settings" };

export default async function NotificationsSettingsPage() {
  const data = await getNotifications();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          Settings
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Channels we use to talk to your customers, and when reminder / overdue
          messages get sent automatically.
        </p>
      </div>

      <NotificationsForm initial={data} />
    </div>
  );
}
