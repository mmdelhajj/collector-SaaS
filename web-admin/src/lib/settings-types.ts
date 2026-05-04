export type WorkspaceSettings = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string | null;
  currency_primary: string;
  currency_secondary: string | null;
  exchange_rate: string | number | null;
  timezone: string;
  locale: "ar" | "en" | "fr";
  plan: string;
  status: string;
};

export type IntegrationsSettings = {
  whatsapp: {
    provider: string;
    api_url: string;
    api_key_set: boolean;
    from_number: string;
  };
  sms: {
    provider: string;
    sid: string;
    token_set: boolean;
    from: string;
  };
  radius: {
    shared_secret_set: boolean;
    allowed_ips: string[];
  };
};

export const TIMEZONES = [
  "Asia/Beirut",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Baghdad",
  "Africa/Cairo",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Paris",
  "UTC",
] as const;

export const LOCALES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "fr", label: "Français" },
] as const;

export const CURRENCIES = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "LBP", label: "Lebanese Pound (LBP)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "AED", label: "UAE Dirham (AED)" },
  { value: "SAR", label: "Saudi Riyal (SAR)" },
  { value: "EGP", label: "Egyptian Pound (EGP)" },
  { value: "TRY", label: "Turkish Lira (TRY)" },
  { value: "GBP", label: "British Pound (GBP)" },
] as const;
