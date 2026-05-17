import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How RunCollect collects, uses, stores, and protects user data in the RunCollect Collector mobile app and runcollect.com platform.",
};

const sections: { heading: string; id?: string; body: React.ReactNode }[] = [
  {
    heading: "1. Who we are",
    body: (
      <>
        <p>
          RunCollect (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides
          a multi-tenant SaaS platform — runcollect.com — used by ISPs,
          electricity providers, water utilities, satellite TV companies, and
          other utility service providers to manage their customers, invoices,
          and field cash collection.
        </p>
        <p>
          This privacy policy applies to the runcollect.com website and the
          RunCollect Collector mobile app (Android package{" "}
          <code>com.runcollect.isp_collector</code>, iOS bundle{" "}
          <code>com.runcollect.ispCollector</code>).
        </p>
        <p>
          RunCollect Collector is a business-to-business (B2B) tool. It is used
          by employees of utility companies — not by the general public. The
          end customers of those utility companies do not use this app
          directly.
        </p>
      </>
    ),
  },
  {
    heading: "2. Data we collect",
    body: (
      <>
        <p>The RunCollect Collector mobile app collects:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            <strong>Account information</strong> — your name, email address,
            phone number, and employer-issued user ID. Required for login and
            attributing your work to you.
          </li>
          <li>
            <strong>Location data</strong> — precise GPS coordinates while you
            are logged in and on duty. Used for: (a) sorting today&apos;s
            assignments by proximity, (b) validating that a payment is being
            recorded at the customer&apos;s location (fraud prevention), and (c)
            optional route history.
          </li>
          <li>
            <strong>Payment records you create</strong> — the amount, currency,
            payment method, customer reference, and timestamp of each payment
            you collect on behalf of your employer.
          </li>
          <li>
            <strong>Photos you take</strong> — only photos you actively choose
            to capture as proof of payment (e.g. signed receipt, cash, customer
            ID). The app does not access your phone&apos;s photo library
            otherwise.
          </li>
          <li>
            <strong>Customer signature</strong> — captured on-screen, attached
            to the payment record.
          </li>
          <li>
            <strong>Voice notes</strong> — only when you actively record one.
            Stored encrypted on our servers.
          </li>
          <li>
            <strong>Device identifiers</strong> — model, OS version, app
            version, and a per-install random ID. Used for diagnostics and
            anti-fraud (detecting cloned installs).
          </li>
          <li>
            <strong>Crash logs and diagnostics</strong> — anonymous error
            reports if the app crashes, sent to our error tracker.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> access your phone&apos;s address book,
          calendar, SMS messages, browsing history, or microphone (other than
          when you explicitly start a voice note).
        </p>
      </>
    ),
  },
  {
    heading: "3. Why we collect this data",
    body: (
      <>
        <ul className="ml-6 list-disc space-y-1">
          <li>Provide the service you and your employer are paying for.</li>
          <li>
            Allow your employer (the company that issued your account) to track
            collections, generate accounting reports, and verify your work.
          </li>
          <li>Send WhatsApp/SMS receipts to the end customer on your behalf.</li>
          <li>
            Detect and prevent fraud (e.g. payments recorded far from the
            customer&apos;s registered location).
          </li>
          <li>Improve app stability via crash reports.</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your data. We do <strong>not</strong>{" "}
          show ads. We do <strong>not</strong> use your data for advertising
          profiles.
        </p>
      </>
    ),
  },
  {
    heading: "4. Who we share data with",
    body: (
      <>
        <p>We share data only with:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            <strong>Your employer</strong> — they own the tenant on RunCollect
            and can see all data you record under their account.
          </li>
          <li>
            <strong>Communications providers</strong> — WhatsApp Business API
            (Meta / 360dialog) and SMS providers (Twilio + local Lebanese
            gateways) to deliver receipts to the customers your employer is
            billing.
          </li>
          <li>
            <strong>Cloud infrastructure</strong> — our hosting provider
            (Scaleway / Hetzner / AWS depending on region) and Cloudflare for
            edge security and content delivery.
          </li>
          <li>
            <strong>Error tracking</strong> — anonymous crash logs to Sentry.
          </li>
        </ul>
        <p>
          We do <strong>not</strong> share your data with advertisers, data
          brokers, or analytics platforms that build user profiles across apps.
        </p>
      </>
    ),
  },
  {
    heading: "5. How long we keep data",
    body: (
      <>
        <ul className="ml-6 list-disc space-y-1">
          <li>
            <strong>Active account data</strong> — kept while your employer&apos;s
            subscription is active.
          </li>
          <li>
            <strong>Payment records</strong> — kept as long as your employer
            requires for accounting / tax purposes (typically 7 years per
            standard accounting law).
          </li>
          <li>
            <strong>Location pings</strong> — automatically purged after 90
            days unless aggregated into a route history report.
          </li>
          <li>
            <strong>Crash logs</strong> — purged after 30 days.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "6. Security",
    body: (
      <>
        <ul className="ml-6 list-disc space-y-1">
          <li>All data in transit is encrypted with TLS 1.2+ via HTTPS.</li>
          <li>
            Passwords are hashed with bcrypt; we never store cleartext
            passwords.
          </li>
          <li>The API is firewalled and rate-limited.</li>
          <li>
            Database backups are encrypted at rest and access is restricted to
            named admins.
          </li>
          <li>
            We follow the principle of least privilege for staff access — most
            staff cannot read individual customer or payment records.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "7. Your rights",
    body: (
      <>
        <p>
          If you are based in the EU/EEA (GDPR), UK, or any jurisdiction with
          equivalent rights, you may:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Request a copy of the data we hold about you.</li>
          <li>Ask for inaccurate data to be corrected.</li>
          <li>Ask for your data to be deleted (see section 8).</li>
          <li>Withdraw consent for non-essential data uses.</li>
          <li>Lodge a complaint with your local data protection authority.</li>
        </ul>
        <p>
          Email{" "}
          <a className="underline" href="mailto:support@runcollect.com">
            support@runcollect.com
          </a>{" "}
          with the subject &quot;Data request&quot;. We respond within 30 days.
        </p>
      </>
    ),
  },
  {
    heading: "8. Data deletion",
    id: "data-deletion",
    body: (
      <>
        <p>
          To request deletion of your RunCollect Collector account and the
          personal data associated with it:
        </p>
        <ol className="ml-6 list-decimal space-y-1">
          <li>
            Email{" "}
            <a className="underline" href="mailto:support@runcollect.com">
              support@runcollect.com
            </a>{" "}
            from the email address registered on your account.
          </li>
          <li>Include the subject line &quot;Delete my account&quot;.</li>
          <li>
            We will verify your identity (by replying to your registered email
            and asking a security question) and delete your personal data
            within 30 days.
          </li>
        </ol>
        <p>
          <strong>Note:</strong> Payment records you created on behalf of your
          employer are owned by your employer and are not deleted by an
          individual request — they are kept under your employer&apos;s
          accounting retention period. Only your personal identifiers (name,
          email, phone, device IDs, location history) are deleted; the
          financial records remain anonymised against your employer&apos;s
          books.
        </p>
      </>
    ),
  },
  {
    heading: "9. Children",
    body: (
      <p>
        RunCollect Collector is a workforce tool. It is not directed at
        children. We do not knowingly collect data from anyone under 18. If you
        believe a child has used the app, contact us and we will delete the
        data.
      </p>
    ),
  },
  {
    heading: "10. Changes to this policy",
    body: (
      <p>
        We may update this policy. Material changes will be announced inside the
        app and on this page. The &quot;Last updated&quot; date below tells you
        when the policy was last revised.
      </p>
    ),
  },
  {
    heading: "11. Contact us",
    body: (
      <>
        <p>RunCollect — Lebanon.</p>
        <p>
          Email:{" "}
          <a className="underline" href="mailto:support@runcollect.com">
            support@runcollect.com
          </a>
          <br />
          Website:{" "}
          <a className="underline" href="https://runcollect.com">
            https://runcollect.com
          </a>
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 2026-05-18</p>
      <div className="prose prose-slate mt-8 space-y-8">
        {sections.map((s) => (
          <section key={s.heading} id={s.id} className="space-y-3">
            <h2 className="text-xl font-semibold">{s.heading}</h2>
            <div className="space-y-3 text-[15px] leading-relaxed">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
