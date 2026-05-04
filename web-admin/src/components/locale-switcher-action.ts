"use server";

import { revalidatePath } from "next/cache";
import { writeLocale } from "@/lib/locale-cookie";
import type { Locale } from "@/lib/i18n";

export async function setLocaleAction(locale: Locale): Promise<void> {
  await writeLocale(locale);
  revalidatePath("/", "layout");
}
