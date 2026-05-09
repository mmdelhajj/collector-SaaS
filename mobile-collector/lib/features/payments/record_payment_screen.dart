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

class _RecordPaymentScreenState extends ConsumerState<RecordPaymentScreen> {
  final _amount = TextEditingController();
  final _notes = TextEditingController();
  final _signatureController = SignatureController(
    penStrokeWidth: 2.5,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  String _method = 'cash';
  bool _saving = false;
  String? _error;
  File? _photo;
  bool _signatureCaptured = false;
  double? _balanceDue;
  String? _customerName;

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
        if (_amount.text.isEmpty) {
          _amount.text = assignment.totalDue.toStringAsFixed(2);
        }
      });
    });
  }

  @override
  void dispose() {
    _amount.dispose();
    _notes.dispose();
    _signatureController.dispose();
    super.dispose();
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
      final amount = double.tryParse(_amount.text.trim());
      if (amount == null || amount <= 0) {
        throw Exception(t.enterValidAmount);
      }
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

      // Outbox-first: the payment row, photo, and signature all land on
      // disk before any network call. SyncService picks it up next tick.
      await db.insertPayment(PaymentsOutboxCompanion.insert(
        clientUuid: generateClientUuid(),
        invoiceId: widget.invoiceId,
        customerId: widget.customerId,
        amount: amount,
        currency: const Value('USD'),
        method: _method,
        notes: Value(finalNotes.isEmpty ? null : finalNotes),
        latitude: Value(pos?.latitude),
        longitude: Value(pos?.longitude),
        photoPath: Value(_photo?.path),
        signaturePath: Value(sigFile?.path),
        recordedAt: DateTime.now(),
      ));

      unawaitedFireAndForget(ref.read(syncServiceProvider).syncAll());

      if (!mounted) return;
      await _showReceiptDialog(amount: amount);
      if (!mounted) return;
      context.pop();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showReceiptDialog({required double amount}) {
    return showReceiptDialog(
      context,
      ReceiptData(
        customerName: _customerName ?? widget.customerId,
        invoiceId: widget.invoiceId,
        amount: amount,
        method: _method,
        collectedAt: DateTime.now(),
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
            TextField(
              controller: _amount,
              decoration: InputDecoration(
                labelText: t.amountUsd,
                border: const OutlineInputBorder(),
                prefixText: '\$ ',
                helperText: _balanceDue == null
                    ? null
                    : '${t.balanceDue}: \$${_balanceDue!.toStringAsFixed(2)}',
              ),
              keyboardType: const TextInputType.numberWithOptions(
                  decimal: true, signed: false),
              autofocus: true,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _method,
              decoration: InputDecoration(
                labelText: t.method,
                border: const OutlineInputBorder(),
              ),
              items: [
                DropdownMenuItem(value: 'cash', child: Text(t.methodCash)),
                DropdownMenuItem(value: 'whish', child: Text(t.methodWhish)),
                DropdownMenuItem(value: 'omt', child: Text(t.methodOmt)),
                DropdownMenuItem(
                    value: 'bank_transfer',
                    child: Text(t.methodBankTransfer)),
                DropdownMenuItem(value: 'card', child: Text(t.methodCard)),
                DropdownMenuItem(value: 'other', child: Text(t.methodOther)),
              ],
              onChanged: (v) => setState(() => _method = v ?? 'cash'),
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
