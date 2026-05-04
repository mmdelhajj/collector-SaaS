<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Receipt {{ $payment->id }} — {{ $tenant->name }}</title>
    <style>
        :root {
            --bg: #faf7f2;
            --fg: #2d1a13;
            --muted: #8a766b;
            --primary: #cc785c;
            --border: #e8dfd5;
        }
        @media (prefers-color-scheme: dark) {
            :root {
                --bg: #1a1612;
                --fg: #f3ebe1;
                --muted: #a89786;
                --border: #3a2f26;
            }
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            background: var(--bg);
            color: var(--fg);
            min-height: 100vh;
            padding: 24px 16px;
        }
        .card {
            max-width: 480px;
            margin: 0 auto;
            background: rgba(255,255,255,0.6);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        @media (prefers-color-scheme: dark) {
            .card { background: rgba(255,255,255,0.03); }
        }
        .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid var(--border); }
        .check {
            display: inline-flex; align-items: center; justify-content: center;
            width: 48px; height: 48px; border-radius: 50%;
            background: rgba(34, 197, 94, 0.1);
            color: rgb(34, 197, 94);
            margin-bottom: 12px;
        }
        h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.01em; }
        .muted { color: var(--muted); font-size: 13px; }
        .amount { font-size: 36px; font-weight: 700; letter-spacing: -0.02em; margin: 24px 0 4px; text-align: center; }
        .amount-label { text-align: center; color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; }
        .row {
            display: flex; justify-content: space-between; align-items: baseline;
            padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 14px;
        }
        .row:last-child { border-bottom: none; }
        .row .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
        .footer { text-align: center; margin-top: 24px; font-size: 11px; color: var(--muted); }
        .badge {
            display: inline-block; padding: 2px 8px; border-radius: 12px;
            font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
        }
        .badge-completed { background: rgba(34, 197, 94, 0.1); color: rgb(34, 197, 94); }
        .badge-refunded { background: rgba(168, 162, 158, 0.15); color: var(--muted); text-decoration: line-through; }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="check">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>
            </div>
            <h1>Payment received</h1>
            <p class="muted">{{ $tenant->name }}</p>
        </div>

        <div>
            <div class="amount">{{ $payment->currency }} {{ number_format((float) $payment->amount, 2) }}</div>
            <div class="amount-label">amount</div>
        </div>

        <div style="margin-top: 24px;">
            <div class="row">
                <span class="label">Receipt</span>
                <span style="font-family: monospace; font-size: 12px;">{{ \Illuminate\Support\Str::limit($payment->id, 13, '…') }}</span>
            </div>
            @if ($invoice)
            <div class="row">
                <span class="label">Invoice</span>
                <span style="font-family: monospace;">{{ $invoice->number }}</span>
            </div>
            @endif
            @if ($customer)
            <div class="row">
                <span class="label">Paid by</span>
                <span>{{ $customer->full_name }}</span>
            </div>
            @endif
            <div class="row">
                <span class="label">Method</span>
                <span style="text-transform: capitalize;">{{ str_replace('_', ' ', $payment->method) }}</span>
            </div>
            <div class="row">
                <span class="label">Date</span>
                <span>{{ optional($payment->collected_at)->format('d M Y · H:i') }}</span>
            </div>
            <div class="row">
                <span class="label">Status</span>
                <span class="badge badge-{{ $payment->status }}">{{ $payment->status }}</span>
            </div>
        </div>

        <div class="footer">
            Issued by {{ $tenant->name }} · {{ optional($payment->created_at)->format('d M Y') }}
        </div>
    </div>
</body>
</html>
