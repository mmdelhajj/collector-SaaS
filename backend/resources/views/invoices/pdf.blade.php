<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Invoice {{ $invoice->number }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Helvetica', sans-serif;
            font-size: 11px;
            color: #333;
            margin: 0;
            padding: 32px 40px;
        }
        h1 { font-size: 22px; margin: 0 0 4px; color: #1a1a1a; letter-spacing: -0.02em; }
        .muted { color: #888; }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #cc785c;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .header-left h2 { margin: 0; font-size: 16px; }
        .header-right {
            text-align: right;
            font-size: 11px;
        }
        .header-right .number {
            font-size: 20px;
            font-weight: 600;
            color: #cc785c;
            margin-bottom: 4px;
        }
        .meta-grid {
            display: table;
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        .meta-grid > div {
            display: table-cell;
            width: 50%;
            vertical-align: top;
        }
        .meta-grid h3 {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #888;
            margin: 0 0 6px;
        }
        .meta-grid p { margin: 1px 0; }
        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }
        table.items th {
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #888;
            border-bottom: 1px solid #ddd;
            padding: 8px 6px;
        }
        table.items th.right, table.items td.right { text-align: right; }
        table.items td {
            padding: 10px 6px;
            border-bottom: 1px solid #f0f0f0;
            vertical-align: top;
        }
        .totals {
            margin-left: auto;
            width: 280px;
        }
        .totals tr td {
            padding: 4px 0;
        }
        .totals tr td.label { color: #888; }
        .totals tr td.value { text-align: right; }
        .totals tr.total td {
            border-top: 2px solid #1a1a1a;
            padding-top: 8px;
            font-size: 14px;
            font-weight: 700;
        }
        .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .status-paid { background: #d1f5e0; color: #066649; }
        .status-open { background: #fef3c7; color: #92400e; }
        .status-overdue { background: #fee2e2; color: #991b1b; }
        .status-cancelled, .status-void { background: #f3f4f6; color: #6b7280; }
        .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #e5e5e5;
            font-size: 9px;
            color: #999;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h1>{{ $tenant->name }}</h1>
            <p class="muted">{{ $tenant->timezone }} · {{ strtoupper($tenant->currency_primary) }}</p>
        </div>
        <div class="header-right">
            <div class="number">{{ $invoice->number }}</div>
            <span class="status-badge status-{{ $invoice->status }}">{{ $invoice->status }}</span>
        </div>
    </div>

    <div class="meta-grid">
        <div>
            <h3>Bill to</h3>
            <p><strong>{{ $customer->full_name }}</strong></p>
            <p>{{ $customer->code }}</p>
            @if ($customer->phone_primary)<p>{{ $customer->phone_primary }}</p>@endif
            @if ($customer->email)<p>{{ $customer->email }}</p>@endif
            @if ($customer->address_line)<p>{{ $customer->address_line }}, {{ $customer->city }}</p>@endif
        </div>
        <div style="text-align: right;">
            <h3>Invoice details</h3>
            <p><span class="muted">Issued:</span> {{ optional($invoice->issued_at)->format('d M Y') }}</p>
            <p><span class="muted">Due:</span> {{ optional($invoice->due_at)->format('d M Y') }}</p>
            @if ($invoice->period_start)
                <p><span class="muted">Period:</span> {{ $invoice->period_start->format('d M') }}–{{ $invoice->period_end->format('d M Y') }}</p>
            @endif
        </div>
    </div>

    <table class="items">
        <thead>
            <tr>
                <th style="width: 60%;">Description</th>
                <th class="right" style="width: 10%;">Qty</th>
                <th class="right" style="width: 15%;">Unit price</th>
                <th class="right" style="width: 15%;">Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($items as $item)
                <tr>
                    <td>
                        <strong>{{ $item->description }}</strong>
                        @if (! empty($item->meta['speed_down_mbps']))
                            <br><span class="muted">{{ $item->meta['speed_down_mbps'] }} / {{ $item->meta['speed_up_mbps'] ?? '—' }} Mbps</span>
                        @endif
                    </td>
                    <td class="right">{{ rtrim(rtrim(number_format($item->quantity, 2), '0'), '.') }}</td>
                    <td class="right">{{ number_format($item->unit_price, 2) }}</td>
                    <td class="right">{{ number_format($item->total, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <table class="totals">
        <tr>
            <td class="label">Subtotal</td>
            <td class="value">{{ $invoice->currency }} {{ number_format($invoice->subtotal, 2) }}</td>
        </tr>
        @if ($invoice->tax_amount > 0)
        <tr>
            <td class="label">Tax</td>
            <td class="value">{{ $invoice->currency }} {{ number_format($invoice->tax_amount, 2) }}</td>
        </tr>
        @endif
        @if ($invoice->discount_amount > 0)
        <tr>
            <td class="label">Discount</td>
            <td class="value">−{{ $invoice->currency }} {{ number_format($invoice->discount_amount, 2) }}</td>
        </tr>
        @endif
        <tr class="total">
            <td>Total due</td>
            <td class="value">{{ $invoice->currency }} {{ number_format($invoice->total, 2) }}</td>
        </tr>
        @if ($invoice->paid_amount > 0)
        <tr>
            <td class="label">Paid</td>
            <td class="value">−{{ $invoice->currency }} {{ number_format($invoice->paid_amount, 2) }}</td>
        </tr>
        <tr class="total">
            <td>Balance</td>
            <td class="value">{{ $invoice->currency }} {{ number_format($invoice->balance_due, 2) }}</td>
        </tr>
        @endif
    </table>

    @if ($invoice->notes)
        <div style="margin-top: 32px; padding: 12px 16px; background: #f9f7f4; border-left: 3px solid #cc785c;">
            <h3 style="margin: 0 0 4px; font-size: 9px;">Notes</h3>
            <p style="margin: 0; white-space: pre-wrap;">{{ $invoice->notes }}</p>
        </div>
    @endif

    <div class="footer">
        Thank you for your business · {{ $tenant->name }}
    </div>
</body>
</html>
