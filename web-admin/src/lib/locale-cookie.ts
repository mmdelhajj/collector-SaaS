import "server-only";
import { cookies } from "next/headers";
import { LOCALES, type Locale } from "@/lib/i18n";

export const LOCALE_COOKIE = "isp_locale";

export async function readLocale(): Promise<Locale> {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  return (LOCALES as string[]).includes(v ?? "") ? (v as Locale) : "en";
}

export async function writeLocale(locale: Locale): Promise<void> {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
