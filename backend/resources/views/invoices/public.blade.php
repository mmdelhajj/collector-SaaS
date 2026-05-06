@include('invoices._layout', [
    'invoice' => $invoice,
    'items' => $items,
    'customer' => $customer,
    'tenant' => $tenant,
    'qrSvg' => null,
    'publicUrl' => null,
    'isPublicWeb' => true,
])
