"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { type Locale, type Messages, makeTranslator } from "./i18n";

type Ctx = {
  locale: Locale;
  messages: Messages;
};

const I18nCtx = createContext<Ctx | null>(null);

/**
 * Wraps the client tree so any descendant client component can call useT()
 * to translate keys without prop-drilling locale through every layer.
 *
 * The dashboard layout is a server component that reads the locale cookie
 * and the corresponding messages dictionary, then renders this provider
 * with both already resolved. Client components then just consume.
 */
export function I18nProvider({
  children,
  locale,
  messages,
}: {
  children: ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useLocale(): Locale {
  const ctx = useContext(I18nCtx);
  return ctx?.locale ?? "en";
}

/**
 * Client-component translator hook. Same key syntax as makeTranslator:
 *
 *   const t = useT();
 *   <h1>{t("nav.customers")}</h1>
 */
export function useT(): (key: string) => string {
  const ctx = useContext(I18nCtx);
  // Defensive fallback so a misplaced consumer doesn't crash the page —
  // it just renders English. Should never happen if provider wraps the
  // dashboard layout.
  const messages = ctx?.messages;
  return useMemo(() => {
    if (!messages) return (key: string) => key;
    // makeTranslator wraps a fresh dict + fallback to English; reuse it
    // so we don't reimplement key resolution.
    return makeTranslator(ctx?.locale ?? "en");
  }, [ctx?.locale, messages]);
}
