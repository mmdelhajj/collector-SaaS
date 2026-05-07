import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart' show Value;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:workmanager/workmanager.dart';

import '../config.dart';
import '../database/app_database.dart';

/// Workmanager identifiers. Keep them stable — the OS uses these to dedupe
/// scheduled work across launches.
const _kPaymentsOutboxTask = 'isp_collector_payments_outbox';
const _kPaymentsOutboxTag = 'payments-outbox';

/// One-time init at app start. Safe to call repeatedly. Pass
/// `isInDebugMode: true` to see WorkManager logs in logcat.
Future<void> initBackgroundSync({bool isInDebugMode = false}) async {
  await Workmanager().initialize(
    backgroundCallbackDispatcher,
    isInDebugMode: isInDebugMode,
  );
}

/// Schedule a periodic background drain of the payments outbox. 15 min is
/// the Android minimum for periodic work; iOS treats this as a *suggestion*
/// and will fire whenever the system grants the budget.
Future<void> schedulePeriodicOutboxSync() async {
  await Workmanager().registerPeriodicTask(
    _kPaymentsOutboxTask,
    _kPaymentsOutboxTag,
    frequency: const Duration(minutes: 15),
    existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
    constraints: Constraints(
      networkType: NetworkType.connected,
      requiresBatteryNotLow: true,
    ),
    backoffPolicy: BackoffPolicy.exponential,
    backoffPolicyDelay: const Duration(minutes: 1),
  );
}

Future<void> cancelPeriodicOutboxSync() async {
  await Workmanager().cancelByUniqueName(_kPaymentsOutboxTask);
}

/// Top-level entry point for the background isolate. Workmanager spawns a
/// fresh isolate every time the OS wakes us up, so we can't share state
/// (Riverpod, singletons) with the foreground app — everything is rebuilt
/// here from scratch.
@pragma('vm:entry-point')
void backgroundCallbackDispatcher() {
  Workmanager().executeTask((task, _) async {
    if (task != _kPaymentsOutboxTask) return Future.value(true);
    try {
      final ok = await _drainOutbox();
      // Returning true marks the run successful; false triggers Workmanager's
      // exponential backoff retry.
      return ok;
    } catch (_) {
      return false;
    }
  });
}

/// Read the bearer token, open Drift, and POST every pending payment.
/// Returns true if every payment was either synced or rejected with a 4xx
/// (no point retrying), false on network failures so Workmanager backs off.
Future<bool> _drainOutbox() async {
  const storage = FlutterSecureStorage();
  final token = await storage.read(key: 'auth_token');
  if (token == null) {
    // Logged out — no work to do, cancel ourselves.
    await Workmanager().cancelByUniqueName(_kPaymentsOutboxTask);
    return true;
  }

  final db = AppDatabase();
  final dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiBaseUrl,
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 60),
    headers: {
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    },
  ));

  var allClean = true;
  try {
    final pending = await db.pendingPayments();
    for (final row in pending) {
      try {
        final hasFiles = row.photoPath != null || row.signaturePath != null;
        final dynamic body;
        Options? options;
        if (hasFiles) {
          body = FormData.fromMap({
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
        final res =
            await dio.post('/api/v1/payments', data: body, options: options);
        final serverId = (res.data['data']?['id'] as num?)?.toInt() ?? 0;
        await db.markPaymentSynced(outboxId: row.id, serverId: serverId);
        for (final path in [row.photoPath, row.signaturePath]) {
          if (path == null) continue;
          try {
            final f = File(path);
            if (await f.exists()) await f.delete();
          } catch (_) {/* swallow */}
        }
      } on DioException catch (e) {
        await db.bumpAttempts(row.id);
        final status = e.response?.statusCode ?? 0;
        if (status >= 400 && status < 500) {
          // Server rejected — stop retrying this row, but the run itself
          // succeeded (we got a definitive answer). Other rows still try.
          await db.markPaymentError(
            outboxId: row.id,
            error: 'Server rejected ($status)',
          );
        } else {
          // Network blip — leave the row, ask Workmanager to back off.
          allClean = false;
        }
      }
    }
  } finally {
    await db.close();
    dio.close();
  }
  return allClean;
}
