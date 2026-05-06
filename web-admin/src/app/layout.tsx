import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { isRtl } from "@/lib/i18n";
import { readLocale } from "@/lib/locale-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "RunCollect — Admin",
    template: "%s · RunCollect",
  },
  description:
    "Multi-tenant platform for ISPs and utility providers — billing, collectors, RADIUS, WhatsApp receipts.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await readLocale();
  const dir = isRtl(locale) ? "rtl" : "ltr";
  return (
    <html
      lang={locale}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
