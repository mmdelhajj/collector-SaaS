"use client";

import { Mail, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

type Customer = {
  full_name: string;
  phone_primary?: string | null;
  whatsapp_phone?: string | null;
  email?: string | null;
};

/**
 * Strip every non-digit and drop the leading + so wa.me / sms: URL schemes
 * accept the number. Returns "" if there's nothing usable left.
 */
function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw.replace(/[^\d]/g, "");
}

export function InvoiceShareActions({
  customer,
  invoiceNumber,
  publicUrl,
  amountLabel,
  tenantName,
}: {
  customer: Customer;
  invoiceNumber: string;
  publicUrl: string;
  amountLabel: string;
  tenantName: string;
}) {
  const wa = normalizePhone(customer.whatsapp_phone ?? customer.phone_primary);
  const sms = normalizePhone(customer.phone_primary);
  const email = customer.email ?? "";

  const message = `Hi ${customer.full_name.split(" ")[0]}, here is your invoice ${invoiceNumber} from ${tenantName} (${amountLabel}). View or download: ${publicUrl}`;
  const subject = `Invoice ${invoiceNumber} — ${tenantName}`;

  if (!wa && !sms && !email) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {wa && (
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#25D366] px-3 text-sm font-medium text-white shadow-sm hover:opacity-90"
          title={`Send via WhatsApp to ${customer.full_name}`}
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      )}
      {sms && (
        <a
          href={`sms:+${sms}?body=${encodeURIComponent(message)}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
          title={`Send via SMS to ${customer.full_name}`}
        >
          <Phone className="size-4" />
          SMS
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
          title={`Email ${email}`}
        >
          <Mail className="size-4" />
          Email
        </a>
      )}
    </div>
  );
}
