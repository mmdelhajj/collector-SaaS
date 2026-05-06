<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Invoice;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\URL;

/**
 * Builds the signed public-invoice URL and renders the matching QR code.
 *
 * The QR is returned as inline SVG so it embeds cleanly into both the PDF
 * (DomPDF supports inline SVG) and the admin/public Blade views without
 * needing temporary file paths.
 */
final class InvoiceQr
{
    public static function publicUrl(Invoice $invoice, int $ttlDays = 30): string
    {
        return URL::temporarySignedRoute(
            'invoices.public',
            now()->addDays($ttlDays),
            ['invoiceId' => $invoice->id],
        );
    }

    public static function svg(string $url, int $size = 160): string
    {
        $renderer = new ImageRenderer(new RendererStyle($size, 1), new SvgImageBackEnd);

        return (new Writer($renderer))->writeString($url);
    }

    /**
     * Inline-friendly SVG for DomPDF and old browsers — strips the XML
     * prolog and DOCTYPE so the SVG can be dropped directly into HTML.
     */
    /**
     * Inline-friendly SVG for DomPDF and older browsers — strips the XML
     * prolog and DOCTYPE so the SVG can be dropped directly into HTML.
     * (The "?>" sequence inside the regex is not a comment escape; using
     * a docblock here so PHP doesn't see "?>" inside a // comment.)
     */
    public static function inlineSvg(string $url, int $size = 160): string
    {
        $svg = self::svg($url, $size);
        $svg = preg_replace('/<\?xml[^?]*\?>\s*/', '', $svg);
        $svg = preg_replace('/<!DOCTYPE[^>]*>\s*/', '', $svg);

        return trim($svg);
    }

    /**
     * Same QR as a base64 data-URL — the most portable form for embedding
     * into Blade-rendered HTML or DomPDF (works even when inline SVG
     * support is patchy).
     */
    public static function dataUrl(string $url, int $size = 160): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode(self::svg($url, $size));
    }
}
