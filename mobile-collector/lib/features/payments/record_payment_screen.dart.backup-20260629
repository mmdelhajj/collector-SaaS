import 'dart:io';

import 'package:drift/drift.dart' show Value;
import 'package:flutter/material.dart';
import 'package:isp_collector/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:signature/signature.dart';

import '../../core/config.dart';
import '../../core/database/app_database.dart';
import '../../core/services/sync_service.dart';
import '../customers/customer_detail_screen.dart' show customerDetailProvider;
import 'receipt_dialog.dart';

class RecordPaymentScreen extends ConsumerStatefulWidget {
  const RecordPaymentScreen({
    super.key,
    required this.invoiceId,
    required this.customerId,
  });

  final String invoiceId;
  final String customerId;

  @override
  ConsumerState<RecordPaymentScreen> createState() =>
      _RecordPaymentScreenState();
}

/// One row in the split-payment list: an amount input + the chosen method.
/// The collector starts with one row pre-filled to the invoice balance and
/// can add more (e.g. $20 cash + $20 whish for a single invoice).
class _Split {
  _Split({String method = 'cash'})
      : amount = TextEditingController(),
        method = method;
  final TextEditingController amount;
  String method;
  void dispose() => amount.dispose();
}

class _RecordPaymentScreenState extends ConsumerState<RecordPaymentScreen> {
  final _notes = TextEditingController();
  final _signatureController = SignatureController(
    penStrokeWidth: 2.5,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  final List<_Split> _splits = [_Split()];
  bool _saving = false;
  String? _error;
  File? _photo;
  bool _signatureCaptured = false;
  double? _balanceDue;
  String? _customerName;

  double get _totalAmount {
    double sum = 0;
    for (final s in _splits) {
      sum += double.tryParse(s.amount.text.trim()) ?? 0;
    }
    return sum;
  }

  @override
  void initState() {
    super.initState();
    // Pre-fill the amount with the invoice's outstanding balance so the
    // collector taps "Mark as Paid" in one step for the common (full)
    // case, and only edits down for partial payments.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final db = ref.read(appDatabaseProvider);
      final assignment = await db.assignmentForInvoice(widget.invoiceId);
      if (!mounted || assignment == null) return;
      setState(() {
        _balanceDue = assignment.totalDue;
        _customerName = assignment.customerName;
        if (_splits.first.amount.text.isEmpty) {
          _splits.first.amount.text = assignment.totalDue.toStringAsFixed(2);
        }
      });
    });
  }

  @override
  void dispose() {
    for (final s in _splits) {
      s.dispose();
    }
    _notes.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  void _addSplit() {
    setState(() => _splits.add(_Split()));
  }

  void _removeSplit(int i) {
    if (_splits.length <= 1) return;
    setState(() {
      _splits.removeAt(i).dispose();
    });
  }

  Future<Position?> _currentPosition() async {
    try {
      final svcOk = await Geolocator.isLocationServiceEnabled();
      if (!svcOk) return null;
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        return null;
      }
      return await Geolocator.getCurrentPosition();
    } catch (_) {
      return null;
    }
  }

  Future<void> _takePhoto() async {
    try {
      final picker = ImagePicker();
      final shot = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 75, // shrink for low-bandwidth uploads
        maxWidth: 1600,
      );
      if (shot == null) return;
      // Move into our app dir so it survives the picker's temp cleanup.
      final docs = await getApplicationDocumentsDirectory();
      final dst = File(p.join(
        docs.path,
        'payment_photos',
        'photo_${DateTime.now().millisecondsSinceEpoch}.jpg',
      ));
      await dst.parent.create(recursive: true);
      await File(shot.path).copy(dst.path);
      if (!mounted) return;
      setState(() => _photo = dst);
    } catch (e) {
      if (mounted) {
        final t = AppLocalizations.of(context);
        setState(() => _error = t.cameraError(e.toString()));
      }
    }
  }

  Future<void> _captureSignature() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => _SignaturePadScreen(controller: _signatureController),
      ),
    );
    if (result == true && _signatureController.isNotEmpty) {
      setState(() => _signatureCaptured = true);
    }
  }

  /// Prompt the collector to confirm a far-from-customer payment with a
  /// typed reason. Returns the trimmed reason on confirm, or null on cancel.
  Future<String?> _askForFarOverride(double meters) async {
    final t = AppLocalizations.of(context);
    final reasonCtrl = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Text(t.tooFarTitle),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t.tooFarBody(
              meters.round(),
              AppConfig.paymentGeofenceMeters.round(),
            )),
            const SizedBox(height: 12),
            TextField(
              controller: reasonCtrl,
              autofocus: true,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: t.reasonForDistance,
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(t.cancel),
          ),
          FilledButton(
            onPressed: () {
              final r = reasonCtrl.text.trim();
              if (r.length < 4) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  SnackBar(content: Text(t.reasonMin4)),
                );
                return;
              }
              Navigator.of(ctx).pop(r);
            },
            child: Text(t.confirmPayment),
          ),
        ],
      ),
    );
    reasonCtrl.dispose();
    return result;
  }

  Future<File?> _saveSignaturePng() async {
    if (!_signatureCaptured || _signatureController.isEmpty) return null;
    final bytes = await _signatureController.toPngBytes();
    if (bytes == null) return null;
    final docs = await getApplicationDocumentsDirectory();
    final dst = File(p.join(
      docs.path,
      'payment_signatures',
      'sig_${DateTime.now().millisecondsSinceEpoch}.png',
    ));
    await dst.parent.create(recursive: true);
    await dst.writeAsBytes(bytes);
    return dst;
  }

  Future<void> _record() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final t = AppLocalizations.of(context);
      // Validate every split row before doing any I/O. Drop any empty
      // (zero-amount) rows so the collector can leave an extra row blank.
      final entries = <({double amount, String method})>[];
      for (final s in _splits) {
        final txt = s.amount.text.trim();
        if (txt.isEmpty) continue;
        final v = double.tryParse(txt);
        if (v == null || v <= 0) {
          throw Exception(t.enterValidAmount);
        }
        entries.add((amount: v, method: s.method));
      }
      if (entries.isEmpty) {
        throw Exception(t.enterValidAmount);
      }
      final amount = entries.fold<double>(0, (a, e) => a + e.amount);
      final pos = await _currentPosition();
      final db = ref.read(appDatabaseProvider);

      // Geofence check: if the customer has a pinned location and the
      // collector's GPS puts them outside the tolerance, demand an explicit
      // override with a typed reason. We never block — a collector who
      // genuinely moved (customer changed address) shouldn't be stuck — but
      // every override is logged into the payment notes for fraud review.
      String? overrideReason;
      double? distanceMeters;
      final assignment = await db.assignmentForInvoice(widget.invoiceId);
      final custLat = assignment?.latitude;
      final custLng = assignment?.longitude;
      if (pos != null && custLat != null && custLng != null) {
        distanceMeters = Geolocator.distanceBetween(
          pos.latitude,
          pos.longitude,
          custLat,
          custLng,
        );
        if (distanceMeters > AppConfig.paymentGeofenceMeters) {
          if (!mounted) return;
          overrideReason = await _askForFarOverride(distanceMeters);
          if (overrideReason == null) {
            // User cancelled — abort without saving.
            setState(() => _saving = false);
            return;
          }
        }
      }

      final sigFile = await _saveSignaturePng();

      // Decorate notes with override info so manager review surfaces it.
      var finalNotes = _notes.text.trim();
      if (overrideReason != null && distanceMeters != null) {
        final note =
            '[GEOFENCE OVERRIDE ${distanceMeters.round()}m] $overrideReason';
        finalNotes = finalNotes.isEmpty ? note : '$finalNotes\n$note';
      }

      // Outbox-first: the payment rows, photo, and signature all land on
      // disk before any network call. SyncService picks it up next tick.
      // Each split row becomes its own payment in the outbox so per-method
      // analytics, cash handover, and the customer history all stay clean.
      final recordedAt = DateTime.now();
      for (final e in entries) {
        await db.insertPayment(PaymentsOutboxCompanion.insert(
          clientUuid: generateClientUuid(),
          invoiceId: widget.invoiceId,
          customerId: widget.customerId,
          amount: e.amount,
          currency: const Value('USD'),
          method: e.method,
          notes: Value(finalNotes.isEmpty ? null : finalNotes),
          latitude: Value(pos?.latitude),
          longitude: Value(pos?.longitude),
          photoPath: Value(_photo?.path),
          signaturePath: Value(sigFile?.path),
          recordedAt: recordedAt,
        ));
      }

      // Wait briefly for sync so the customer-detail re-fetch hits a server
      // that already has the new rows. If sync is slow or offline we still
      // pop — the outbox indicator on the home tab shows the queue.
      try {
        await ref
            .read(syncServiceProvider)
            .syncAll()
            .timeout(const Duration(seconds: 2));
      } catch (_) {
        // ignore — offline or timeout is fine, server will catch up later.
      }
      ref.invalidate(customerDetailProvider(widget.customerId));

      if (!mounted) return;
      await _showReceiptDialog(amount: amount, entries: entries);
      if (!mounted) return;
      context.pop();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showReceiptDialog({
    required double amount,
    required List<({double amount, String method})> entries,
  }) {
    return showReceiptDialog(
      context,
      ReceiptData(
        customerName: _customerName ?? widget.customerId,
        invoiceId: widget.invoiceId,
        amount: amount,
        method: entries.length == 1 ? entries.first.method : 'split',
        collectedAt: DateTime.now(),
        splits: entries.length > 1
            ? entries
                .map((e) => ReceiptSplit(method: e.method, amount: e.amount))
                .toList(growable: false)
            : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(t.recordPayment)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_error!,
                    style: TextStyle(color: Colors.red.shade900)),
              ),
              const SizedBox(height: 12),
            ],
            for (int i = 0; i < _splits.length; i++) ...[
              _SplitRow(
                amountController: _splits[i].amount,
                method: _splits[i].method,
                showRemove: _splits.length > 1,
                helperText: i == 0 && _balanceDue != null
                    ? '${t.balanceDue}: \$${_balanceDue!.toStringAsFixed(2)}'
                    : null,
                autofocus: i == 0,
                onMethodChanged: (v) =>
                    setState(() => _splits[i].method = v ?? 'cash'),
                onAmountChanged: () => setState(() {}),
                onRemove: () => _removeSplit(i),
              ),
              const SizedBox(height: 8),
            ],
            Row(
              children: [
                TextButton.icon(
                  icon: const Icon(Icons.add, size: 18),
                  label: Text(t.addMethod),
                  onPressed: _addSplit,
                ),
                const Spacer(),
                if (_splits.length > 1)
                  Text(
                    '${t.totalLabel}: \$${_totalAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _notes,
              decoration: InputDecoration(
                labelText: t.notesOptional,
                border: const OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 16),
            _ProofRow(
              label: t.photoProof,
              caption: _photo == null ? t.optional : t.captured,
              icon: _photo == null ? Icons.photo_camera : Icons.check_circle,
              iconColor: _photo == null ? null : Colors.green,
              preview: _photo == null
                  ? null
                  : ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.file(
                        _photo!,
                        height: 56,
                        width: 56,
                        fit: BoxFit.cover,
                      ),
                    ),
              onAction: _takePhoto,
              onClear:
                  _photo == null ? null : () => setState(() => _photo = null),
            ),
            const SizedBox(height: 8),
            _ProofRow(
              label: t.signatureLabel,
              caption: _signatureCaptured ? t.captured : t.optional,
              icon: _signatureCaptured ? Icons.check_circle : Icons.draw,
              iconColor: _signatureCaptured ? Colors.green : null,
              onAction: _captureSignature,
              onClear: _signatureCaptured
                  ? () {
                      _signatureController.clear();
                      setState(() => _signatureCaptured = false);
                    }
                  : null,
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              icon: _saving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : const Icon(Icons.check),
              label: Text(_saving ? t.saving : t.markAsPaid),
              onPressed: _saving ? null : _record,
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              t.outboxFooter,
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _SplitRow extends StatelessWidget {
  const _SplitRow({
    required this.amountController,
    required this.method,
    required this.showRemove,
    required this.onMethodChanged,
    required this.onAmountChanged,
    required this.onRemove,
    this.helperText,
    this.autofocus = false,
  });

  final TextEditingController amountController;
  final String method;
  final bool showRemove;
  final ValueChanged<String?> onMethodChanged;
  final VoidCallback onAmountChanged;
  final VoidCallback onRemove;
  final String? helperText;
  final bool autofocus;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 3,
          child: TextField(
            controller: amountController,
            decoration: InputDecoration(
              labelText: t.amountUsd,
              border: const OutlineInputBorder(),
              prefixText: '\$ ',
              helperText: helperText,
              isDense: true,
            ),
            keyboardType: const TextInputType.numberWithOptions(
                decimal: true, signed: false),
            autofocus: autofocus,
            onChanged: (_) => onAmountChanged(),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          flex: 4,
          child: DropdownButtonFormField<String>(
            value: method,
            decoration: InputDecoration(
              labelText: t.method,
              border: const OutlineInputBorder(),
              isDense: true,
            ),
            items: [
              DropdownMenuItem(value: 'cash', child: Text(t.methodCash)),
              DropdownMenuItem(value: 'whish', child: Text(t.methodWhish)),
              DropdownMenuItem(value: 'omt', child: Text(t.methodOmt)),
              DropdownMenuItem(
                  value: 'bank_transfer', child: Text(t.methodBankTransfer)),
              DropdownMenuItem(value: 'card', child: Text(t.methodCard)),
              DropdownMenuItem(value: 'other', child: Text(t.methodOther)),
            ],
            onChanged: onMethodChanged,
          ),
        ),
        if (showRemove)
          IconButton(
            icon: const Icon(Icons.remove_circle_outline),
            tooltip: t.removeMethod,
            onPressed: onRemove,
          ),
      ],
    );
  }
}

class _ProofRow extends StatelessWidget {
  const _ProofRow({
    required this.label,
    required this.caption,
    required this.icon,
    required this.onAction,
    this.iconColor,
    this.preview,
    this.onClear,
  });

  final String label;
  final String caption;
  final IconData icon;
  final Color? iconColor;
  final Widget? preview;
  final VoidCallback onAction;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onAction,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Theme.of(context).dividerColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, color: iconColor ?? Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(caption,
                      style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            if (preview != null) ...[preview!, const SizedBox(width: 8)],
            if (onClear != null)
              IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: onClear,
                tooltip: 'Clear',
              ),
          ],
        ),
      ),
    );
  }
}

class _SignaturePadScreen extends StatelessWidget {
  const _SignaturePadScreen({required this.controller});
  final SignatureController controller;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(t.customerSignature),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => controller.clear(),
            tooltip: t.clear,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Container(
              color: Colors.white,
              child: Signature(
                controller: controller,
                backgroundColor: Colors.white,
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      child: Text(t.cancel),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        if (controller.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(t.pleaseSign)),
                          );
                          return;
                        }
                        Navigator.of(context).pop(true);
                      },
                      child: Text(t.save),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

void unawaitedFireAndForget(Future<dynamic> future) {
  future.then((_) {}, onError: (_) {});
}
