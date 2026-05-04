import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import fr from "@/messages/fr.json";

export type Locale = "en" | "ar" | "fr";

export const LOCALES: Locale[] = ["en", "ar", "fr"];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
};

export const RTL_LOCALES: Locale[] = ["ar"];

const messages = { en, ar, fr } as const;

export type Messages = typeof en;

export function getMessages(locale: Locale): Messages {
  return (messages[locale] ?? messages.en) as Messages;
}

/**
 * Tiny translator. Pass a dotted key path: t("nav.customers").
 * Falls back to English, then to the key itself.
 */
export function makeTranslator(locale: Locale) {
  const dict = getMessages(locale);
  const fallback = getMessages("en");
  return function t(key: string): string {
    return resolve(dict, key) ?? resolve(fallback, key) ?? key;
  };
}

function resolve(obj: unknown, key: string): string | undefined {
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}
