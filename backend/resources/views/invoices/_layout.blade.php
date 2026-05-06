{{--
  Unified invoice layout — used by both:
    - invoices.pdf      (DomPDF rendering, A4)
    - invoices.public   (HTML page the QR code resolves to)

  Variables expected:
    $invoice, $items, $customer, $tenant
    $qrSvg        — rendered SVG string (or null)
    $publicUrl    — signed URL for the invoice (or null)
    $isPublicWeb  — true on the public web page; false in the PDF
--}}
<!DOCTYPE html>
<html lang="{{ $tenant->locale ?? 'en' }}" dir="auto">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invoice {{ $invoice->number }} — {{ $tenant->name }}</title>
    <style>
        * { box-sizing: border-box; }
        :root {
            --primary: #C77035;
            --primary-deep: #A85B22;
            --ink: #1a1612;
            --ink-2: #4a3f37;
            --muted: #8a766b;
            --rule: #ece4d9;
            --bg-soft: #faf7f2;
            --paid: #066649;     --paid-bg: #d1f5e0;
            --open: #92400e;     --open-bg: #fef3c7;
            --overdue: #991b1b;  --overdue-bg: #fee2e2;
            --void: #6b7280;     --void-bg: #f3f4f6;
        }
        body {
            font-family: 'Helvetica', 'DejaVu Sans', 'Arial', sans-serif;
            color: var(--ink);
            margin: 0;
            padding: 32px 40px;
            background: #ffffff;
            font-size: 11px;
            line-height: 1.5;
        }
        .doc { max-width: 720px; margin: 0 auto; }
        .header {
            display: table; width: 100%;
            margin-bottom: 28px;
            border-bottom: 2px solid var(--primary);
            padding-bottom: 18px;
        }
        .header .left, .header .right { display: table-cell; vertical-align: top; }
        .header .right { text-align: right; }
        .brand {
            display: inline-flex; align-items: center; gap: 10px;
        }
        .brand-tile {
            width: 36px; height: 36px;
            background: var(--primary); border-radius: 8px;
            display: inline-flex; align-items: center; justify-content: center;
        }
        .brand-name {
            font-size: 16px; font-weight: 700; letter-spacing: -0.01em;
            color: var(--ink);
        }
        .brand-sub { font-size: 10px; color: var(--muted); margin-top: 1px; }
        .invoice-num {
            font-size: 22px; font-weight: 700; color: var(--primary);
            letter-spacing: -0.01em;
        }
        .invoice-tag {
            font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em;
            color: var(--muted); margin-bottom: 2px;
        }
        .status-badge {
            display: inline-block; margin-top: 6px;
            padding: 3px 10px; border-radius: 999px;
            font-size: 9px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.06em;
        }
        .status-paid     { color: var(--paid);     background: var(--paid-bg); }
        .status-open     { color: var(--open);     background: var(--open-bg); }
        .status-overdue  { color: var(--overdue);  background: var(--overdue-bg); }
        .status-cancelled, .status-void, .status-draft, .status-partial
                         { color: var(--void);     background: var(--void-bg); }

        .meta {
            display: table; width: 100%;
            margin-bottom: 24px;
            border-collapse: separate; border-spacing: 16px 0;
        }
        .meta > div {
            display: table-cell; vertical-align: top;
            width: 50%;
            padding: 14px 16px;
            background: var(--bg-soft);
            border-radius: 8px;
            border: 1px solid var(--rule);
        }
        .section-title {
            font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em;
            color: var(--muted); font-weight: 700;
            margin: 0 0 8px;
        }
        .meta p { margin: 2px 0; font-size: 11px; color: var(--ink-2); }
        .meta .name { color: var(--ink); font-weight: 600; font-size: 12px; margin-bottom: 4px; }
        .kv { display: table; width: 100%; }
        .kv .k {
            display: table-cell; color: var(--muted);
            font-size: 10px; padding: 2px 8px 2px 0;
            white-space: nowrap;
        }
        .kv .v {
            display: table-cell; color: var(--ink);
            font-size: 11px; font-weight: 500;
            text-align: right;
        }

        table.items {
            width: 100%; border-collapse: collapse;
            margin: 8px 0 8px;
        }
        table.items th {
            text-align: left;
            font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em;
            color: var(--muted); font-weight: 700;
            border-bottom: 1.5px solid var(--ink);
            padding: 10px 8px;
        }
        table.items th.right, table.items td.right { text-align: right; }
        table.items td {
            padding: 12px 8px;
            border-bottom: 1px solid var(--rule);
            vertical-align: top;
            color: var(--ink-2);
        }
        table.items td.desc { color: var(--ink); font-weight: 500; }
        table.items .desc-sub { display: block; color: var(--muted); font-size: 10px; margin-top: 2px; }

        .totals-wrap { display: table; width: 100%; margin-top: 8px; }
        .notes-cell, .totals-cell { display: table-cell; vertical-align: top; }
        .notes-cell { width: 60%; padding-right: 24px; }
        .totals-cell { width: 40%; }
        .totals { width: 100%; }
        .totals td { padding: 6px 0; font-size: 11px; }
        .totals td.label { color: var(--muted); }
        .totals td.value { text-align: right; color: var(--ink); font-variant-numeric: tabular-nums; }
        .totals tr.grand td {
            border-top: 1.5px solid var(--ink);
            padding-top: 10px; font-size: 14px; font-weight: 700;
        }
        .totals tr.balance td {
            border-top: 1px solid var(--rule);
            padding-top: 10px;
            font-size: 13px; font-weight: 700; color: var(--primary);
        }

        .notes {
            background: var(--bg-soft);
            border-left: 3px solid var(--primary);
            padding: 12px 14px;
            border-radius: 0 8px 8px 0;
        }

        .qr-block {
            margin-top: 36px;
            padding-top: 20px;
            border-top: 1px solid var(--rule);
            display: table; width: 100%;
        }
        .qr-img, .qr-text { display: table-cell; vertical-align: middle; }
        .qr-img { width: 110px; }
        .qr-img svg { width: 100px; height: 100px; display: block; }
        .qr-text {
            padding-left: 20px;
            font-size: 11px; color: var(--ink-2);
        }
        .qr-text strong { color: var(--ink); display: block; margin-bottom: 4px; font-size: 12px; }
        .qr-text .small { font-size: 9px; color: var(--muted); margin-top: 6px; word-break: break-all; }

        .footer {
            margin-top: 28px;
            padding-top: 16px;
            border-top: 1px solid var(--rule);
            text-align: center;
            font-size: 10px;
            color: var(--muted);
        }
        .footer .tenant {
            color: var(--ink); font-weight: 600;
            display: block; margin-bottom: 2px;
        }

        @if (!empty($isPublicWeb))
        body { background: var(--bg-soft); padding: 24px 12px; }
        .doc {
            background: #ffffff;
            border: 1px solid var(--rule);
            border-radius: 14px;
            padding: 36px 36px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        @media (max-width: 540px) {
            body { padding: 12px 6px; }
            .doc { padding: 20px 18px; }
            .header { padding-bottom: 14px; margin-bottom: 18px; }
            .meta { border-spacing: 0; }
            .meta > div {
                display: block; width: 100%;
                margin-bottom: 12px;
            }
            .totals-wrap, .qr-block { display: block; }
            .notes-cell, .totals-cell, .qr-img, .qr-text {
                display: block; width: 100%; padding: 0;
            }
            .totals-cell { margin-top: 18px; }
            .qr-img { text-align: center; margin-bottom: 12px; }
            .qr-img svg { margin: 0 auto; }
            .qr-text { padding-left: 0; text-align: center; }
        }
        @endif
    </style>
</head>
<body>
<div class="doc">

    <div class="header">
        <div class="left">
            @php
                // Self-contained SVG (background + RunCollect mark) so it
                // ships as one <img> data URL — DomPDF doesn't render inline
                // <svg> elements reliably, but it does render data-URL <img>.
                $brandSvg = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="36" height="36">
  <rect width="32" height="32" rx="7" fill="#C77035"/>
  <g stroke="#FFFFFF" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M4 12 L7 16 L4 20"    stroke-width="2.0" opacity="0.30"/>
    <path d="M8 12 L11 16 L8 20"   stroke-width="2.0" opacity="0.55"/>
    <path d="M12 12 L15 16 L12 20" stroke-width="2.0" opacity="0.80"/>
    <path d="M16 18 L20 22 L28 8"  stroke-width="3.5"/>
  </g>
</svg>
SVG;
                $brandDataUrl = 'data:image/svg+xml;base64,'.base64_encode($brandSvg);
            @endphp
            <div class="brand">
                <img src="{{ $brandDataUrl }}" alt="logo"
                     style="width:36px; height:36px; display:inline-block; vertical-align:middle;"/>
                <span style="display:inline-block; vertical-align:middle; margin-left:10px;">
                    <span class="brand-name">{{ $tenant->name }}</span>
                    <span class="brand-sub">{{ strtoupper($tenant->currency_primary ?? 'USD') }} · {{ $tenant->timezone }}</span>
                </span>
            </div>
        </div>
        <div class="right">
            <div class="invoice-tag">Invoice</div>
            <div class="invoice-num">{{ $invoice->number }}</div>
            <span class="status-badge status-{{ $invoice->status }}">{{ $invoice->status }}</span>
        </div>
    </div>

    <div class="meta">
        <div>
            <p class="section-title">Bill to</p>
            <p class="name" dir="auto">{{ $customer->full_name ?? trim(($customer->first_name ?? '').' '.($customer->last_name ?? '')) }}</p>
            @if ($customer->email)<p dir="auto">{{ $customer->email }}</p>@endif
            @if ($customer->phone_primary)<p dir="ltr">{{ $customer->phone_primary }}</p>@endif
            @php
                $addressBits = array_filter([
                    $customer->address_line ?? null,
                    $customer->neighborhood ?? null,
                    $customer->district ?? null,
                    $customer->city ?? null,
                ]);
            @endphp
            @if (!empty($addressBits))
                <p dir="auto">{{ implode(' — ', $addressBits) }}</p>
            @endif
        </div>
        <div>
            <p class="section-title">Invoice details</p>
            <div class="kv">
                <div style="display:table-row;">
                    <span class="k">Invoice No.</span>
                    <span class="v">{{ $invoice->number }}</span>
                </div>
                <div style="display:table-row;">
                    <span class="k">Issue Date</span>
                    <span class="v">{{ optional($invoice->issued_at)->format('M j, Y') }}</span>
                </div>
                <div style="display:table-row;">
                    <span class="k">Due Date</span>
                    <span class="v">{{ optional($invoice->due_at)->format('M j, Y') }}</span>
                </div>
                @if ($invoice->period_start && $invoice->period_end)
                <div style="display:table-row;">
                    <span class="k">Period</span>
                    <span class="v">{{ $invoice->period_start->format('M j') }} – {{ $invoice->period_end->format('M j, Y') }}</span>
                </div>
                @endif
                <div style="display:table-row;">
                    <span class="k">Status</span>
                    <span class="v" style="text-transform: uppercase; font-weight: 700;">{{ $invoice->status }}</span>
                </div>
            </div>
        </div>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 60%;">Description</th>
                <th class="right" style="width: 8%;">Qty</th>
                <th class="right" style="width: 16%;">Unit Price</th>
                <th class="right" style="width: 16%;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($items as $item)
                <tr>
                    <td class="desc" dir="auto">
                        {{ $item->description }}
                        @if (! empty($item->meta['speed_down_mbps']))
                            <span class="desc-sub">{{ $item->meta['speed_down_mbps'] }} / {{ $item->meta['speed_up_mbps'] ?? '—' }} Mbps</span>
                        @endif
                    </td>
                    <td class="right">{{ rtrim(rtrim(number_format((float) $item->quantity, 2), '0'), '.') }}</td>
                    <td class="right">${{ number_format((float) $item->unit_price, 2) }}</td>
                    <td class="right">${{ number_format((float) $item->total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals-wrap">
        <div class="notes-cell">
            @if ($invoice->notes)
                <p class="section-title">Notes</p>
                <div class="notes" dir="auto" style="white-space: pre-wrap;">{{ $invoice->notes }}</div>
            @endif
        </div>
        <div class="totals-cell">
            <table class="totals">
                <tr>
                    <td class="label">Subtotal</td>
                    <td class="value">${{ number_format((float) $invoice->subtotal, 2) }}</td>
                </tr>
                @if ((float) $invoice->tax_amount > 0)
                <tr>
                    <td class="label">Tax</td>
                    <td class="value">${{ number_format((float) $invoice->tax_amount, 2) }}</td>
                </tr>
                @endif
                @if ((float) $invoice->discount_amount > 0)
                <tr>
                    <td class="label">Discount</td>
                    <td class="value">−${{ number_format((float) $invoice->discount_amount, 2) }}</td>
                </tr>
                @endif
                <tr class="grand">
                    <td>Total</td>
                    <td class="value">${{ number_format((float) $invoice->total, 2) }}</td>
                </tr>
                @if ((float) $invoice->paid_amount > 0)
                <tr>
                    <td class="label">Paid</td>
                    <td class="value">−${{ number_format((float) $invoice->paid_amount, 2) }}</td>
                </tr>
                @endif
                <tr class="balance">
                    <td>Balance Due</td>
                    <td class="value">${{ number_format((float) $invoice->balance_due, 2) }}</td>
                </tr>
            </table>
        </div>
    </div>

    @if (!empty($qrSvg) && !empty($publicUrl))
        <div class="qr-block">
            <div class="qr-img">
                {{-- DomPDF reliably renders <img src="data:..."> but is
                     finicky about inline <svg> elements, so embed as data URL --}}
                <img src="data:image/svg+xml;base64,{{ base64_encode($qrSvg) }}"
                     alt="QR code for this invoice"
                     style="width:110px; height:110px; display:block;"/>
            </div>
            <div class="qr-text">
                <strong>Scan to view invoice</strong>
                Open this invoice on any device — view payment status, download a fresh PDF, or share with the customer.
                <div class="small">{{ $publicUrl }}</div>
            </div>
        </div>
    @endif

    <div class="footer">
        <span class="tenant">{{ $tenant->name }}</span>
        Thank you for your business
    </div>

</div>
</body>
</html>
