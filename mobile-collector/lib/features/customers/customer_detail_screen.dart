import 'package:flutter/material.dart';
import 'package:isp_collector/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../payments/receipt_dialog.dart';

class CustomerDetail {
  CustomerDetail({
    required this.customer,
    required this.invoices,
    required this.payments,
  });

  final Map<String, dynamic> customer;
  final List<Map<String, dynamic>> invoices;
  final List<Map<String, dynamic>> payments;

  String get id => customer['id']?.toString() ?? '';
  String get fullName => customer['full_name']?.toString() ?? 'Unknown';
  String? get code => customer['code'] as String?;
  String? get phonePrimary => customer['phone_primary'] as String?;
  String? get whatsappPhone => customer['whatsapp_phone'] as String?;
  String? get addressLine => customer['address_line'] as String?;
  String? get city => customer['city'] as String?;
  String? get status => customer['status'] as String?;
  double get balanceDue => (customer['balance_due'] as num?)?.toDouble() ?? 0.0;
  double? get latitude => (customer['latitude'] as num?)?.toDouble();
  double? get longitude => (customer['longitude'] as num?)?.toDouble();

  String? get firstOpenInvoiceId {
    for (final inv in invoices) {
      final st = inv['status']?.toString();
      if (st == 'open' || st == 'partial' || st == 'overdue') {
        return inv['id']?.toString();
      }
    }
    return null;
  }
}

final customerDetailProvider =
    FutureProvider.family<CustomerDetail, String>((ref, customerId) async {
  final api = ref.watch(apiClientProvider);
  // Fan out the three reads in parallel — the screen is no use without all
  // three and we'd rather pay one round-trip's wait than three.
  final results = await Future.wait([
    api.dio.get('/api/v1/customers/$customerId'),
    api.dio.get(
      '/api/v1/invoices',
      queryParameters: {
        'filter[customer_id]': customerId,
        'per_page': 50,
        'sort': '-due_at',
      },
    ),
    api.dio.get(
      '/api/v1/payments',
      queryParameters: {
        'filter[customer_id]': customerId,
        'per_page': 25,
        'sort': '-collected_at',
      },
    ),
  ]);
  return CustomerDetail(
    customer: (results[0].data['data'] as Map).cast<String, dynamic>(),
    invoices:
        (results[1].data['data'] as List).cast<Map<String, dynamic>>(),
    payments:
        (results[2].data['data'] as List).cast<Map<String, dynamic>>(),
  );
});

class CustomerDetailScreen extends ConsumerWidget {
  const CustomerDetailScreen({
    super.key,
    required this.customerId,
    this.preferredInvoiceId,
  });

  final String customerId;
  final String? preferredInvoiceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final detailAsync = ref.watch(customerDetailProvider(customerId));

    return Scaffold(
      appBar: AppBar(title: Text(t.customer)),
      body: detailAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => _ErrorView(
          message: '$e',
          onRetry: () => ref.invalidate(customerDetailProvider(customerId)),
        ),
        data: (d) => _CustomerBody(detail: d),
      ),
      floatingActionButton: detailAsync.maybeWhen(
        data: (d) {
          final invId = preferredInvoiceId ?? d.firstOpenInvoiceId;
          if (invId == null) return null;
          return FloatingActionButton.extended(
            onPressed: () => context.push('/record/$invId/${d.id}'),
            icon: const Icon(Icons.payments),
            label: Text(t.recordPayment),
          );
        },
        orElse: () => null,
      ),
    );
  }
}

class _CustomerBody extends StatelessWidget {
  const _CustomerBody({required this.detail});
  final CustomerDetail detail;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final localeCode = Localizations.localeOf(context).languageCode;
    final fmt = NumberFormat.currency(
      locale: localeCode == 'ar' ? 'ar' : 'en_US',
      symbol: '\$',
    );

    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(child: _Header(detail: detail, fmt: fmt)),
        SliverToBoxAdapter(child: _ContactRow(detail: detail)),
        const SliverToBoxAdapter(child: SizedBox(height: 8)),
        _SectionHeader(
          title: t.outstandingInvoices,
          trailing: Text(
            '${_openInvoices(detail).length}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        if (_openInvoices(detail).isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
              child: Text(
                t.noOpenInvoices,
                style: const TextStyle(color: Colors.black54),
              ),
            ),
          )
        else
          SliverList.separated(
            itemCount: _openInvoices(detail).length,
            separatorBuilder: (_, __) =>
                const Divider(height: 1, thickness: 0.5),
            itemBuilder: (_, i) =>
                _InvoiceTile(invoice: _openInvoices(detail)[i], fmt: fmt),
          ),
        const SliverToBoxAdapter(child: SizedBox(height: 12)),
        _SectionHeader(title: t.recentPayments),
        if (detail.payments.isEmpty)
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
              child: Text(
                t.noPaymentsYet,
                style: const TextStyle(color: Colors.black54),
              ),
            ),
          )
        else
          () {
            final groups = _groupPayments(detail.payments);
            return SliverList.separated(
              itemCount: groups.length,
              separatorBuilder: (_, __) =>
                  const Divider(height: 1, thickness: 0.5),
              itemBuilder: (_, i) => _PaymentTile(
                payments: groups[i],
                fmt: fmt,
                customerName: detail.fullName,
              ),
            );
          }(),
        // Bottom padding so the FAB doesn't cover the last row.
        const SliverToBoxAdapter(child: SizedBox(height: 96)),
      ],
    );
  }

  /// Group payments that were recorded together in a single collector session:
  /// same invoice + same collected_at timestamp = one logical payment with a
  /// split breakdown. The list is already sorted by -collected_at server-side
  /// so consecutive matches collapse cleanly.
  List<List<Map<String, dynamic>>> _groupPayments(
    List<Map<String, dynamic>> payments,
  ) {
    final groups = <List<Map<String, dynamic>>>[];
    for (final p in payments) {
      if (groups.isNotEmpty) {
        final head = groups.last.first;
        final sameInvoice = head['invoice_id'] == p['invoice_id'];
        final sameTime = head['collected_at'] == p['collected_at'];
        if (sameInvoice && sameTime) {
          groups.last.add(p);
          continue;
        }
      }
      groups.add([p]);
    }
    return groups;
  }

  List<Map<String, dynamic>> _openInvoices(CustomerDetail d) => d.invoices
      .where((i) =>
          i['status'] == 'open' ||
          i['status'] == 'partial' ||
          i['status'] == 'overdue')
      .toList();
}

class _Header extends StatelessWidget {
  const _Header({required this.detail, required this.fmt});
  final CustomerDetail detail;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            detail.fullName,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              if (detail.code != null) ...[
                Text(
                  detail.code!,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    color: Colors.black54,
                  ),
                ),
                const SizedBox(width: 8),
              ],
              if (detail.status != null) _StatusChip(status: detail.status!),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: detail.balanceDue > 0
                  ? Colors.red.shade50
                  : Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: detail.balanceDue > 0
                    ? Colors.red.shade200
                    : Colors.green.shade200,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  detail.balanceDue > 0
                      ? Icons.warning_amber_rounded
                      : Icons.check_circle,
                  color: detail.balanceDue > 0
                      ? Colors.red.shade700
                      : Colors.green.shade700,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppLocalizations.of(context).balanceDue,
                        style: const TextStyle(
                            fontSize: 12, color: Colors.black54),
                      ),
                      Text(
                        fmt.format(detail.balanceDue),
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 20,
                          color: detail.balanceDue > 0
                              ? Colors.red.shade900
                              : Colors.green.shade900,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ContactRow extends StatelessWidget {
  const _ContactRow({required this.detail});
  final CustomerDetail detail;

  @override
  Widget build(BuildContext context) {
    final lines = <Widget>[];
    final primaryPhone = detail.phonePrimary;
    if (primaryPhone != null && primaryPhone.isNotEmpty) {
      lines.add(_iconLine(
        Icons.phone,
        primaryPhone,
        context,
        onTap: () => _dial(context, primaryPhone),
      ));
    }
    final wa = detail.whatsappPhone;
    if (wa != null && wa.isNotEmpty && wa != primaryPhone) {
      lines.add(_iconLine(
        Icons.chat,
        '$wa (WhatsApp)',
        context,
        onTap: () => _whatsapp(context, wa),
      ));
    } else if (primaryPhone != null && primaryPhone.isNotEmpty) {
      // No separate WhatsApp number — offer WhatsApp on the primary phone.
      lines.add(_iconLine(
        Icons.chat,
        '$primaryPhone (WhatsApp)',
        context,
        onTap: () => _whatsapp(context, primaryPhone),
      ));
    }
    final addr = [
      detail.addressLine,
      detail.city,
    ].whereType<String>().where((s) => s.isNotEmpty).join(', ');
    if (addr.isNotEmpty || (detail.latitude != null && detail.longitude != null)) {
      lines.add(_iconLine(
        Icons.location_on,
        addr.isEmpty ? '${detail.latitude}, ${detail.longitude}' : addr,
        context,
        onTap: () => _openMap(context, detail, addr),
      ));
    }
    if (lines.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [for (final l in lines) ...[l, const SizedBox(height: 4)]],
      ),
    );
  }

  Widget _iconLine(IconData icon, String text, BuildContext ctx,
      {VoidCallback? onTap}) {
    final primary = Theme.of(ctx).colorScheme.primary;
    final row = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Icon(icon, size: 16, color: primary),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: onTap == null
                ? null
                : TextStyle(
                    color: primary,
                    decoration: TextDecoration.underline,
                  ),
          ),
        ),
      ],
    );
    if (onTap == null) return row;
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: row,
      ),
    );
  }

  static Future<void> _dial(BuildContext ctx, String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (!await launchUrl(uri)) {
      _showError(ctx, 'tel: $phone');
    }
  }

  static Future<void> _whatsapp(BuildContext ctx, String phone) async {
    final cleaned = phone.replaceAll(RegExp(r'[^0-9]'), '');
    final uri = Uri.parse('https://wa.me/$cleaned');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      _showError(ctx, 'WhatsApp: $phone');
    }
  }

  static Future<void> _openMap(
      BuildContext ctx, CustomerDetail d, String address) async {
    Uri uri;
    if (d.latitude != null && d.longitude != null) {
      // Pinned coordinates: use geo: so the OS picks the user's preferred
      // map app (Google Maps, Waze, Apple Maps).
      final label = Uri.encodeComponent(d.fullName);
      uri = Uri.parse('geo:${d.latitude},${d.longitude}?q=${d.latitude},${d.longitude}($label)');
    } else {
      // Fallback to a search URL when we only have a written address.
      final q = Uri.encodeComponent(address);
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      _showError(ctx, address);
    }
  }

  static void _showError(BuildContext ctx, String what) {
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(content: Text('Could not open: $what')),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});
  final String status;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (status) {
      'active' => (Colors.green.shade100, Colors.green.shade900),
      'suspended' => (Colors.red.shade100, Colors.red.shade900),
      'terminated' => (Colors.grey.shade300, Colors.grey.shade800),
      'dormant' => (Colors.amber.shade100, Colors.amber.shade900),
      _ => (Colors.blue.shade100, Colors.blue.shade900),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: fg,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.trailing});
  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Row(
          children: [
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: Colors.black87,
              ),
            ),
            const Spacer(),
            if (trailing != null) trailing!,
          ],
        ),
      ),
    );
  }
}

class _InvoiceTile extends StatelessWidget {
  const _InvoiceTile({required this.invoice, required this.fmt});
  final Map<String, dynamic> invoice;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final localeCode = Localizations.localeOf(context).languageCode;
    final number = invoice['number']?.toString() ?? '#';
    final balance = (invoice['balance_due'] as num?)?.toDouble() ?? 0.0;
    final total = (invoice['total'] as num?)?.toDouble() ?? 0.0;
    final status = invoice['status']?.toString() ?? '';
    final dueAtStr = invoice['due_at']?.toString();
    final dueAt = dueAtStr != null ? DateTime.tryParse(dueAtStr) : null;
    final overdue = dueAt != null && dueAt.isBefore(DateTime.now());

    return ListTile(
      dense: true,
      leading: Icon(
        overdue ? Icons.error_outline : Icons.receipt_long,
        color: overdue ? Colors.red : null,
      ),
      title: Text(number,
          style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(
        [
          status,
          if (dueAt != null)
            t.dueOn(DateFormat.yMMMd(localeCode).format(dueAt.toLocal())),
        ].join(' • '),
        style: TextStyle(
          fontSize: 12,
          color: overdue ? Colors.red.shade900 : Colors.black54,
        ),
      ),
      trailing: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(fmt.format(balance),
              style: const TextStyle(
                  fontWeight: FontWeight.w700, fontFamily: 'monospace')),
          if (balance < total)
            Text(
              t.ofTotal(fmt.format(total)),
              style: const TextStyle(fontSize: 11, color: Colors.black54),
            ),
        ],
      ),
    );
  }
}

class _PaymentTile extends StatelessWidget {
  const _PaymentTile({
    required this.payments,
    required this.fmt,
    required this.customerName,
  });

  /// One or more payment rows that share the same invoice + collected_at —
  /// they represent a single collector session paid via multiple methods.
  final List<Map<String, dynamic>> payments;
  final NumberFormat fmt;
  final String customerName;

  @override
  Widget build(BuildContext context) {
    final localeCode = Localizations.localeOf(context).languageCode;
    final head = payments.first;
    final total = payments.fold<double>(
      0,
      (a, p) => a + ((p['amount'] as num?)?.toDouble() ?? 0),
    );
    final collectedAtStr = head['collected_at']?.toString();
    final collectedAt =
        collectedAtStr != null ? DateTime.tryParse(collectedAtStr) : null;
    final invoiceId = head['invoice_id']?.toString() ??
        head['invoice']?['id']?.toString() ??
        '';

    final isSplit = payments.length > 1;
    final dateLine = collectedAt == null
        ? ''
        : DateFormat.yMMMd(localeCode).add_jm().format(collectedAt.toLocal());

    return ListTile(
      dense: !isSplit,
      leading: const Icon(Icons.check_circle_outline, color: Colors.green),
      title: Text(
        fmt.format(total),
        style: const TextStyle(
            fontFamily: 'monospace', fontWeight: FontWeight.w700),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isSplit)
            for (final p in payments)
              Text(
                '  • ${fmt.format((p['amount'] as num?)?.toDouble() ?? 0)} '
                '${p['method']?.toString() ?? ''}',
                style: const TextStyle(fontSize: 12, color: Colors.black87),
              )
          else
            Text(
              head['method']?.toString() ?? '',
              style: const TextStyle(fontSize: 12, color: Colors.black54),
            ),
          if (dateLine.isNotEmpty)
            Text(
              dateLine,
              style: const TextStyle(fontSize: 11, color: Colors.black45),
            ),
        ],
      ),
      trailing: const Icon(Icons.print, size: 20),
      onTap: () => showReceiptDialog(
        context,
        ReceiptData(
          customerName: customerName,
          invoiceId: invoiceId,
          amount: total,
          method: isSplit ? 'split' : (head['method']?.toString() ?? ''),
          collectedAt: collectedAt ?? DateTime.now(),
          splits: isSplit
              ? payments
                  .map((p) => ReceiptSplit(
                        method: p['method']?.toString() ?? '',
                        amount: (p['amount'] as num?)?.toDouble() ?? 0,
                      ))
                  .toList(growable: false)
              : null,
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 40, color: Colors.black38),
            const SizedBox(height: 12),
            Text(
              '${t.couldNotLoadCustomer}\n\n$message',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: Text(t.retry),
            ),
          ],
        ),
      ),
    );
  }
}
