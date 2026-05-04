import { getMessages } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n-provider";
import { readLocale } from "@/lib/locale-cookie";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await readLocale();
  const messages = getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="relative flex min-h-screen flex-1 items-center justify-center bg-background bg-grid px-4 py-12">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-primary/5 to-transparent"
          aria-hidden
        />
        {children}
      </div>
    </I18nProvider>
  );
}
