"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function InvoicePublicLinkActions({
  url,
  expiresInDays,
}: {
  url: string;
  expiresInDays: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(`Public link copied — expires in ${expiresInDays} days`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy — your browser blocked clipboard access");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={copy} type="button">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy public link"}
      </Button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
      >
        <ExternalLink className="size-4" />
        Open public view
      </a>
    </>
  );
}
