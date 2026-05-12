import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:flutter/material.dart';
import 'package:isp_collector/l10n/app_localizations.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:share_plus/share_plus.dart';

/// Snapshot of a payment for receipt rendering. Either freshly recorded
/// (from RecordPaymentScreen) or pulled from the server payment history
/// (from CustomerDetailScreen for reprinting).
class ReceiptSplit {
  const ReceiptSplit({required this.method, required this.amount});
  final String method;
  final double amount;
}

class ReceiptData {
  const ReceiptData({
    required this.customerName,
    required this.invoiceId,
    required this.amount,
    required this.method,
    required this.collectedAt,
    this.splits,
  });

  final String customerName;
  final String invoiceId;
  final double amount;
  final String method;
  final DateTime collectedAt;

  /// When the collector accepted more than one payment method for this
  /// invoice in a single session, this lists them. `amount` is still the
  /// grand total. Null/empty for single-method payments and old reprints.
  final List<ReceiptSplit>? splits;
}

String buildReceiptText(BuildContext ctx, ReceiptData r) {
  final t = AppLocalizations.of(ctx);
  final dateStr = r.collectedAt.toLocal().toString().split('.').first;
  final hasSplits = (r.splits?.length ?? 0) > 1;
  final lines = <String>[
    t.receiptHeader,
    '----------------------------',
    '${t.receiptCustomer}: ${r.customerName}',
    '${t.receiptInvoice}: ${r.invoiceId}',
    '${t.receiptAmount}: \$${r.amount.toStringAsFixed(2)}',
  ];
  if (hasSplits) {
    for (final s in r.splits!) {
      lines.add('  - \$${s.amount.toStringAsFixed(2)} (${s.method})');
    }
  } else {
    lines.add('${t.receiptMethod}: ${r.method}');
  }
  lines.addAll([
    '${t.receiptDate}: $dateStr',
    '----------------------------',
    t.receiptThanks,
  ]);
  return lines.join('\n');
}

Future<List<int>> _buildEscPosBytes(BuildContext ctx, ReceiptData r) async {
  final profile = await CapabilityProfile.load();
  final gen = Generator(PaperSize.mm58, profile);
  final t = AppLocalizations.of(ctx);
  final dateStr = r.collectedAt.toLocal().toString().split('.').first;

  final out = <int>[];
  out.addAll(gen.text(
    t.receiptHeader,
    styles: const PosStyles(
        align: PosAlign.center, bold: true, height: PosTextSize.size2),
  ));
  out.addAll(gen.hr());
  out.addAll(gen.text('${t.receiptCustomer}: ${r.customerName}'));
  out.addAll(gen.text('${t.receiptInvoice}: ${r.invoiceId}'));
  out.addAll(gen.text(
    '${t.receiptAmount}: \$${r.amount.toStringAsFixed(2)}',
    styles: const PosStyles(bold: true),
  ));
  if ((r.splits?.length ?? 0) > 1) {
    for (final s in r.splits!) {
      out.addAll(gen.text(
        '  - \$${s.amount.toStringAsFixed(2)} (${s.method})',
      ));
    }
  } else {
    out.addAll(gen.text('${t.receiptMethod}: ${r.method}'));
  }
  out.addAll(gen.text('${t.receiptDate}: $dateStr'));
  out.addAll(gen.hr());
  out.addAll(gen.text(t.receiptThanks,
      styles: const PosStyles(align: PosAlign.center)));
  out.addAll(gen.feed(2));
  out.addAll(gen.cut());
  return out;
}

Future<void> _printReceipt(BuildContext ctx, ReceiptData r) async {
  final t = AppLocalizations.of(ctx);
  final messenger = ScaffoldMessenger.of(ctx);
  try {
    final paired = await PrintBluetoothThermal.pairedBluetooths;
    if (paired.isEmpty) {
      messenger.showSnackBar(SnackBar(content: Text(t.noPrintersFound)));
      return;
    }
    BluetoothInfo? target;
    if (paired.length == 1) {
      target = paired.first;
    } else {
      target = await showDialog<BluetoothInfo>(
        context: ctx,
        builder: (dialogCtx) => SimpleDialog(
          title: Text(t.selectPrinter),
          children: [
            for (final dev in paired)
              SimpleDialogOption(
                onPressed: () => Navigator.pop(dialogCtx, dev),
                child: Text('${dev.name}\n${dev.macAdress}'),
              ),
          ],
        ),
      );
      if (target == null) return;
    }
    messenger.showSnackBar(SnackBar(content: Text(t.printing)));
    final connected = await PrintBluetoothThermal.connect(
      macPrinterAddress: target.macAdress,
    );
    if (!connected) throw Exception('connect failed');
    final bytes = await _buildEscPosBytes(ctx, r);
    await PrintBluetoothThermal.writeBytes(bytes);
    await PrintBluetoothThermal.disconnect;
  } catch (e) {
    messenger.showSnackBar(
      SnackBar(content: Text(t.printerError(e.toString()))),
    );
  }
}

/// Show the standard receipt dialog with Print, Share, and Done actions.
/// Used both from RecordPaymentScreen (right after a payment) and from
/// CustomerDetailScreen (for re-printing past receipts).
Future<void> showReceiptDialog(BuildContext context, ReceiptData r) async {
  final t = AppLocalizations.of(context);
  final receipt = buildReceiptText(context, r);
  await showDialog<void>(
    context: context,
    builder: (dialogCtx) => AlertDialog(
      title: Text(t.paymentRecorded),
      content: SingleChildScrollView(
        child: Text(receipt, style: const TextStyle(fontFamily: 'monospace')),
      ),
      actionsOverflowDirection: VerticalDirection.down,
      actionsOverflowAlignment: OverflowBarAlignment.end,
      actions: [
        TextButton.icon(
          icon: const Icon(Icons.print),
          label: Text(t.printReceipt),
          onPressed: () => _printReceipt(dialogCtx, r),
        ),
        TextButton.icon(
          icon: const Icon(Icons.share),
          label: Text(t.shareReceipt),
          onPressed: () {
            Share.share(receipt, subject: t.receiptHeader);
          },
        ),
        FilledButton(
          onPressed: () => Navigator.of(dialogCtx).pop(),
          child: Text(t.done),
        ),
      ],
    ),
  );
}
