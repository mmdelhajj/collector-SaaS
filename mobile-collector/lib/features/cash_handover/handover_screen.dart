import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:isp_collector/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:signature/signature.dart';

import '../../core/api_client.dart';
import '../assignments/assignments_screen.dart' show cashOnHandProvider;

class PendingCash {
  PendingCash({
    required this.expectedAmount,
    required this.count,
    required this.breakdown,
  });
  final double expectedAmount;
  final int count;
  final Map<String, _MethodTotal> breakdown;

  factory PendingCash.fromJson(Map<String, dynamic> j) {
    final b = (j['breakdown_by_method'] as Map?)?.cast<String, dynamic>() ?? {};
    return PendingCash(
      expectedAmount: (j['expected_amount'] as num?)?.toDouble() ?? 0.0,
      count: (j['count'] as num?)?.toInt() ?? 0,
      breakdown: b.map((k, v) => MapEntry(
            k,
            _MethodTotal(
              count: (v['count'] as num?)?.toInt() ?? 0,
              total: (v['total'] as num?)?.toDouble() ?? 0.0,
            ),
          )),
    );
  }
}

class _MethodTotal {
  _MethodTotal({required this.count, required this.total});
  final int count;
  final double total;
}

class Supervisor {
  Supervisor({required this.id, required this.name, required this.email});
  final int id;
  final String name;
  final String email;

  factory Supervisor.fromJson(Map<String, dynamic> j) => Supervisor(
        id: (j['id'] as num).toInt(),
        name: j['name']?.toString() ?? '',
        email: j['email']?.toString() ?? '',
      );
}

final pendingCashProvider = FutureProvider<PendingCash>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.dio.get('/api/v1/collector/pending-cash');
  return PendingCash.fromJson((res.data['data'] as Map).cast<String, dynamic>());
});

final supervisorsProvider = FutureProvider<List<Supervisor>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.dio.get('/api/v1/collector/supervisors');
  return ((res.data['data'] as List).cast<Map<String, dynamic>>())
      .map(Supervisor.fromJson)
      .toList();
});

class HandoverScreen extends ConsumerStatefulWidget {
  const HandoverScreen({super.key});

  @override
  ConsumerState<HandoverScreen> createState() => _HandoverScreenState();
}

class _HandoverScreenState extends ConsumerState<HandoverScreen> {
  final _amountCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  final _signatureController = SignatureController(
    penStrokeWidth: 2.5,
    penColor: Colors.black,
    exportBackgroundColor: Colors.white,
  );

  int? _supervisorId;
  File? _photo;
  bool _signatureCaptured = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _notesCtrl.dispose();
    _signatureController.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    try {
      final picker = ImagePicker();
      final shot = await picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 75,
        maxWidth: 1600,
      );
      if (shot == null) return;
      final docs = await getApplicationDocumentsDirectory();
      final dst = File(p.join(
        docs.path,
        'handover_photos',
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
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => _SignaturePadScreen(controller: _signatureController),
      ),
    );
    if (ok == true && _signatureController.isNotEmpty) {
      setState(() => _signatureCaptured = true);
    }
  }

  Future<File?> _saveSignaturePng() async {
    if (!_signatureCaptured || _signatureController.isEmpty) return null;
    final bytes = await _signatureController.toPngBytes();
    if (bytes == null) return null;
    final docs = await getApplicationDocumentsDirectory();
    final dst = File(p.join(
      docs.path,
      'handover_signatures',
      'sig_${DateTime.now().millisecondsSinceEpoch}.png',
    ));
    await dst.parent.create(recursive: true);
    await dst.writeAsBytes(bytes);
    return dst;
  }

  Future<void> _submit(PendingCash pending) async {
    final t = AppLocalizations.of(context);
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final amount = double.tryParse(_amountCtrl.text.trim());
      if (amount == null || amount <= 0) {
        throw Exception(t.enterCountedAmount);
      }
      // Soft mismatch check — let collector continue, but force a notes
      // entry explaining the gap so the supervisor sees it instantly.
      final mismatch = (amount - pending.expectedAmount).abs();
      if (mismatch > 0.01 && _notesCtrl.text.trim().isEmpty) {
        throw Exception(
          t.explainDifference('\$${mismatch.toStringAsFixed(2)}'),
        );
      }

      final sigFile = await _saveSignaturePng();
      final api = ref.read(apiClientProvider);
      final form = FormData.fromMap({
        'amount': amount.toString(),
        'currency': 'USD',
        if (_supervisorId != null) 'to_user_id': _supervisorId.toString(),
        if (_notesCtrl.text.trim().isNotEmpty) 'notes': _notesCtrl.text.trim(),
        if (_photo != null) 'photo': await MultipartFile.fromFile(_photo!.path),
        if (sigFile != null)
          'signature': await MultipartFile.fromFile(sigFile.path),
      });

      await api.dio.post(
        '/api/v1/collector/handover-cash',
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t.handoverSubmitted)),
      );
      // Refresh both pending-cash flavors so the assignments screen and
      // any later handover visit reflect the now-empty bundle.
      ref.invalidate(pendingCashProvider);
      ref.invalidate(cashOnHandProvider);
      context.pop();
    } on DioException catch (e) {
      final body = e.response?.data;
      final msg = body is Map && body['message'] is String
          ? body['message'] as String
          : (e.message ?? e.type.name);
      setState(() => _error = msg);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final pendingAsync = ref.watch(pendingCashProvider);
    final supervisorsAsync = ref.watch(supervisorsProvider);
    final localeCode = Localizations.localeOf(context).languageCode;
    final fmt = NumberFormat.currency(
      locale: localeCode == 'ar' ? 'ar' : 'en_US',
      symbol: '\$',
    );

    return Scaffold(
      appBar: AppBar(title: Text(t.cashHandover)),
      body: pendingAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('${t.couldNotLoadPendingCash}\n\n$e',
                textAlign: TextAlign.center),
          ),
        ),
        data: (pending) {
          if (pending.count == 0) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.check_circle,
                        size: 56, color: Colors.green),
                    const SizedBox(height: 12),
                    Text(
                      t.nothingToHandOver,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      t.noUnbundledCash,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            );
          }
          // Pre-fill the counted-amount field once with the expected value.
          if (_amountCtrl.text.isEmpty) {
            _amountCtrl.text = pending.expectedAmount.toStringAsFixed(2);
          }
          final counted = double.tryParse(_amountCtrl.text.trim()) ?? 0;
          final diff = counted - pending.expectedAmount;
          final mismatch = diff.abs() > 0.01;

          return SingleChildScrollView(
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
                _ExpectedCard(pending: pending, fmt: fmt),
                const SizedBox(height: 16),
                TextField(
                  controller: _amountCtrl,
                  decoration: InputDecoration(
                    labelText: t.countedAmountUsd,
                    helperText: mismatch
                        ? (diff < 0
                            ? t.shortByAddNote(fmt.format(-diff))
                            : t.overByAddNote(fmt.format(diff)))
                        : t.matchesExpected,
                    helperStyle: TextStyle(
                      color: mismatch
                          ? Colors.red.shade700
                          : Colors.green.shade700,
                      fontWeight: FontWeight.w600,
                    ),
                    border: const OutlineInputBorder(),
                    prefixText: '\$ ',
                  ),
                  keyboardType: const TextInputType.numberWithOptions(
                      decimal: true, signed: false),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                supervisorsAsync.when(
                  loading: () => const LinearProgressIndicator(minHeight: 2),
                  error: (_, __) => const SizedBox.shrink(),
                  data: (sups) => DropdownButtonFormField<int?>(
                    value: _supervisorId,
                    decoration: InputDecoration(
                      labelText: t.handCashTo,
                      border: const OutlineInputBorder(),
                    ),
                    items: [
                      DropdownMenuItem<int?>(
                          value: null, child: Text(t.notSpecified)),
                      ...sups.map((s) => DropdownMenuItem<int?>(
                            value: s.id,
                            child: Text(s.name),
                          )),
                    ],
                    onChanged: (v) => setState(() => _supervisorId = v),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _notesCtrl,
                  decoration: InputDecoration(
                    labelText: mismatch
                        ? t.notesRequiredForDiff
                        : t.notesOptional,
                    border: const OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                _ProofRow(
                  label: t.photoOfCash,
                  caption: _photo == null ? t.optional : t.captured,
                  icon: _photo == null
                      ? Icons.photo_camera
                      : Icons.check_circle,
                  iconColor: _photo == null ? null : Colors.green,
                  preview: _photo == null
                      ? null
                      : ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Image.file(_photo!,
                              height: 56, width: 56, fit: BoxFit.cover),
                        ),
                  onAction: _takePhoto,
                  onClear: _photo == null
                      ? null
                      : () => setState(() => _photo = null),
                ),
                const SizedBox(height: 8),
                _ProofRow(
                  label: t.supervisorSignature,
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
                  icon: _submitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.upload),
                  label: Text(_submitting ? t.submitting : t.submitHandover),
                  onPressed: _submitting ? null : () => _submit(pending),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  t.statusPendingNote,
                  style:
                      const TextStyle(fontSize: 12, color: Colors.black54),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ExpectedCard extends StatelessWidget {
  const _ExpectedCard({required this.pending, required this.fmt});
  final PendingCash pending;
  final NumberFormat fmt;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            t.expected,
            style: const TextStyle(fontSize: 12, color: Colors.black54),
          ),
          const SizedBox(height: 2),
          Text(
            fmt.format(pending.expectedAmount),
            style: const TextStyle(
              fontFamily: 'monospace',
              fontWeight: FontWeight.w800,
              fontSize: 28,
            ),
          ),
          Text(
            t.acrossPayments(pending.count),
            style: const TextStyle(fontSize: 12),
          ),
          if (pending.breakdown.isNotEmpty) ...[
            const Divider(height: 20),
            for (final entry in pending.breakdown.entries)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Text(
                      _methodLabel(context, entry.key),
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    const Spacer(),
                    Text(
                      '${entry.value.count} × ${fmt.format(entry.value.total)}',
                      style: const TextStyle(fontFamily: 'monospace'),
                    ),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }

  String _methodLabel(BuildContext context, String code) {
    final t = AppLocalizations.of(context);
    switch (code) {
      case 'cash':
        return t.methodCash;
      case 'whish':
        return t.methodWhish;
      case 'omt':
        return t.methodOmt;
      case 'bank_transfer':
        return t.methodBankTransfer;
      case 'card':
        return t.methodCard;
      default:
        return code;
    }
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
            Icon(icon,
                color: iconColor ?? Theme.of(context).colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: const TextStyle(fontWeight: FontWeight.w600)),
                  Text(caption, style: Theme.of(context).textTheme.bodySmall),
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
        title: Text(t.supervisorSignatureTitle),
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
