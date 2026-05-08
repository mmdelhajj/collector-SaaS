import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show Value;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api_client.dart';
import '../database/app_database.dart';

/// Pulls assignments and pushes the payment outbox. Designed to be safe to
/// call from anywhere (a button, a timer, app resume) — it serialises calls
/// internally so concurrent triggers don't double-post payments.
class SyncService {
  SyncService(this._api, this._db);

  final ApiClient _api;
  final AppDatabase _db;

  bool _running = false;
  Timer? _timer;

  /// Start a periodic sync loop. Safe to call multiple times — only the first
  /// schedules a timer.
  void start({Duration interval = const Duration(minutes: 2)}) {
    if (_timer != null) return;
    _timer = Timer.periodic(interval, (_) => syncAll());
    // Kick off immediately too so the user doesn't wait for the first tick.
    unawaited(syncAll());
  }

  void stop() {
    _timer?.cancel();
    _timer = null;
  }

  /// Run pull + push end-to-end. Returns true if both halves completed
  /// without throwing. Errors are caught and recorded per-payment in the
  /// outbox so the caller doesn't need to know about partial failures.
  Future<bool> syncAll() async {
    if (_running) return false;
    _running = true;
    try {
      var ok = true;
      try {
        await pullAssignments();
      } catch (_) {
        ok = false;
      }
      try {
        await pushPendingPayments();
      } catch (_) {
        ok = false;
      }
      return ok;
    } finally {
      _running = false;
    }
  }

  /// Replace the cached assignments table with what the server has now.
  /// Server is the source of truth for assignments — no merge needed.
  Future<void> pullAssignments() async {
    final res = await _api.dio.get('/api/v1/collector/my-assignments');
    final list = (res.data['data'] as List).cast<Map<String, dynamic>>();
    final now = DateTime.now();
    final rows = list.map((j) {
      final inv = j['invoice'] as Map<String, dynamic>?;
      final cust = inv?['customer'] as Map<String, dynamic>?;
      return AssignmentsLocalCompanion.insert(
        id: Value(j["id"] as int),
        invoiceId: inv?['id']?.toString() ?? '',
        customerId: cust?['id']?.toString() ?? '',
        customerName: cust?['full_name']?.toString() ?? 'Unknown',
        customerPhone: Value(cust?['phone_primary'] as String?),
        address: Value(cust?['address_line'] as String?),
        totalDue: (inv?['balance_due'] as num?)?.toDouble() ?? 0.0,
        currency: const Value('USD'),
        status: Value(j['status']?.toString() ?? 'pending'),
        serviceCategory: Value(
          (inv?['service_category'] as Map<String, dynamic>?)?['name']
              as String?,
        ),
        latitude: Value((cust?['latitude'] as num?)?.toDouble()),
        longitude: Value((cust?['longitude'] as num?)?.toDouble()),
        cachedAt: now,
      );
    }).toList();
    await _db.replaceAssignments(rows);
  }

  /// Drain the outbox. Each payment is posted independently — one failure
  /// doesn't abort the rest. Idempotency is enforced via `client_uuid` so a
  /// retried POST after a server-side success doesn't duplicate the row.
  Future<void> pushPendingPayments() async {
    final pending = await _db.pendingPayments();
    for (final row in pending) {
      try {
        final hasFiles = row.photoPath != null || row.signaturePath != null;
        final dynamic body;
        Options? options;
        if (hasFiles) {
          // Multipart so the photo/signature ride along with the payment in
          // the same request — the server only marks a payment synced after
          // it has the proof artifacts, not before.
          final form = FormData.fromMap({
            'client_uuid': row.clientUuid,
            'customer_id': row.customerId,
            'invoice_id': row.invoiceId,
            'amount': row.amount.toString(),
            'currency': row.currency,
            'method': row.method,
            if (row.notes != null) 'notes': row.notes,
            if (row.latitude != null) 'latitude': row.latitude.toString(),
            if (row.longitude != null) 'longitude': row.longitude.toString(),
            'collected_at': row.recordedAt.toUtc().toIso8601String(),
            if (row.photoPath != null && File(row.photoPath!).existsSync())
              'photo': await MultipartFile.fromFile(row.photoPath!),
            if (row.signaturePath != null &&
                File(row.signaturePath!).existsSync())
              'signature': await MultipartFile.fromFile(row.signaturePath!),
          });
          body = form;
          options = Options(contentType: 'multipart/form-data');
        } else {
          body = {
            'client_uuid': row.clientUuid,
            'customer_id': row.customerId,
            'invoice_id': row.invoiceId,
            'amount': row.amount,
            'currency': row.currency,
            'method': row.method,
            if (row.notes != null) 'notes': row.notes,
            if (row.latitude != null) 'latitude': row.latitude,
            if (row.longitude != null) 'longitude': row.longitude,
            'collected_at': row.recordedAt.toUtc().toIso8601String(),
          };
        }
        final res = await _api.dio
            .post('/api/v1/payments', data: body, options: options);
        final serverId = (res.data['data']?['id'] as num?)?.toInt() ?? 0;
        await _db.markPaymentSynced(outboxId: row.id, serverId: serverId);
        // Best-effort cleanup of local proof files once the server has them.
        for (final path in [row.photoPath, row.signaturePath]) {
          if (path == null) continue;
          try {
            final f = File(path);
            if (await f.exists()) await f.delete();
          } catch (_) {/* swallow — not critical */}
        }
      } on DioException catch (e) {
        await _db.bumpAttempts(row.id);
        // 4xx from the server means our payload is bad — keep the error so
        // the user can see it; the outbox row stays unsynced and we won't
        // hammer the API blindly on every tick.
        final status = e.response?.statusCode ?? 0;
        final msg = status >= 400 && status < 500
            ? 'Server rejected (${status}): ${_extractMessage(e.response?.data)}'
            : 'Network error: ${e.message ?? e.type.name}';
        await _db.markPaymentError(outboxId: row.id, error: msg);
      } catch (e) {
        await _db.bumpAttempts(row.id);
        await _db.markPaymentError(outboxId: row.id, error: e.toString());
      }
    }
  }

  String _extractMessage(dynamic body) {
    if (body is Map && body['message'] is String) {
      return body['message'] as String;
    }
    return 'unknown';
  }
}

/// Generates a v4-ish uuid without pulling in another dependency. Good
/// enough as an idempotency key — the server's job is to dedupe by it.
String generateClientUuid() {
  final r = Random.secure();
  String hex(int n) =>
      List.generate(n, (_) => r.nextInt(16).toRadixString(16)).join();
  return '${hex(8)}-${hex(4)}-4${hex(3)}-'
      '${(8 + r.nextInt(4)).toRadixString(16)}${hex(3)}-${hex(12)}';
}

final syncServiceProvider = Provider<SyncService>((ref) {
  final api = ref.watch(apiClientProvider);
  final db = ref.watch(appDatabaseProvider);
  final svc = SyncService(api, db);
  ref.onDispose(svc.stop);
  return svc;
});
