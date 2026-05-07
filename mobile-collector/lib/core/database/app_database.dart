import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

/// Cached collector assignments synced from the server. The server is the
/// source of truth — every pull replaces matching rows by id.
class AssignmentsLocal extends Table {
  IntColumn get id => integer()();
  TextColumn get invoiceId => text()();
  TextColumn get customerId => text()();
  TextColumn get customerName => text()();
  TextColumn get customerPhone => text().nullable()();
  TextColumn get address => text().nullable()();
  RealColumn get totalDue => real()();
  TextColumn get currency => text().withDefault(const Constant('USD'))();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  TextColumn get serviceCategory => text().nullable()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  DateTimeColumn get cachedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Local outbox for payments recorded by the collector. Rows are created with
/// synced=false; the SyncService POSTs them and flips the flag (or records an
/// error message and a retry timestamp).
class PaymentsOutbox extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get clientUuid => text().unique()(); // idempotency key for the API
  TextColumn get invoiceId => text()();
  TextColumn get customerId => text()();
  RealColumn get amount => real()();
  TextColumn get currency => text().withDefault(const Constant('USD'))();
  TextColumn get method => text()();
  TextColumn get notes => text().nullable()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  // Local filesystem paths to proof artifacts captured at payment time.
  // The file lives in the app's documents dir; sync uploads it as multipart.
  TextColumn get photoPath => text().nullable()();
  TextColumn get signaturePath => text().nullable()();
  DateTimeColumn get recordedAt => dateTime()();
  BoolColumn get synced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get syncedAt => dateTime().nullable()();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  // The server-issued payment id, captured after a successful POST so we can
  // dedupe if the user retries.
  IntColumn get serverId => integer().nullable()();
}

@DriftDatabase(tables: [AssignmentsLocal, PaymentsOutbox])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            await m.addColumn(paymentsOutbox, paymentsOutbox.photoPath);
            await m.addColumn(paymentsOutbox, paymentsOutbox.signaturePath);
          }
        },
      );

  // ── Assignments ────────────────────────────────────────────────────────

  Future<List<AssignmentsLocalData>> allAssignments() =>
      (select(assignmentsLocal)..orderBy([
            (a) => OrderingTerm(expression: a.status, mode: OrderingMode.asc),
            (a) => OrderingTerm(expression: a.id, mode: OrderingMode.desc),
          ]))
          .get();

  Stream<List<AssignmentsLocalData>> watchAssignments() =>
      (select(assignmentsLocal)..orderBy([
            (a) => OrderingTerm(expression: a.status, mode: OrderingMode.asc),
            (a) => OrderingTerm(expression: a.id, mode: OrderingMode.desc),
          ]))
          .watch();

  Future<void> replaceAssignments(List<AssignmentsLocalCompanion> rows) async {
    await transaction(() async {
      await delete(assignmentsLocal).go();
      await batch((b) => b.insertAll(assignmentsLocal, rows));
    });
  }

  Future<AssignmentsLocalData?> assignmentForInvoice(String invoiceId) =>
      (select(assignmentsLocal)..where((a) => a.invoiceId.equals(invoiceId)))
          .getSingleOrNull();

  // ── Outbox ─────────────────────────────────────────────────────────────

  Future<int> insertPayment(PaymentsOutboxCompanion row) =>
      into(paymentsOutbox).insert(row);

  Future<List<PaymentsOutboxData>> pendingPayments() =>
      (select(paymentsOutbox)
            ..where((p) => p.synced.equals(false))
            ..orderBy([(p) => OrderingTerm(expression: p.recordedAt)]))
          .get();

  Stream<int> watchPendingCount() =>
      (selectOnly(paymentsOutbox)
            ..addColumns([paymentsOutbox.id.count()])
            ..where(paymentsOutbox.synced.equals(false)))
          .watchSingle()
          .map((row) => row.read(paymentsOutbox.id.count()) ?? 0);

  Future<void> markPaymentSynced({
    required int outboxId,
    required int serverId,
  }) =>
      (update(paymentsOutbox)..where((p) => p.id.equals(outboxId))).write(
        PaymentsOutboxCompanion(
          synced: const Value(true),
          syncedAt: Value(DateTime.now()),
          serverId: Value(serverId),
          lastError: const Value(null),
        ),
      );

  Future<void> markPaymentError({
    required int outboxId,
    required String error,
  }) =>
      (update(paymentsOutbox)..where((p) => p.id.equals(outboxId))).write(
        PaymentsOutboxCompanion(lastError: Value(error)),
      );

  Future<void> bumpAttempts(int outboxId) async {
    final row = await (select(paymentsOutbox)..where((p) => p.id.equals(outboxId)))
        .getSingleOrNull();
    if (row == null) return;
    await (update(paymentsOutbox)..where((p) => p.id.equals(outboxId))).write(
      PaymentsOutboxCompanion(attempts: Value(row.attempts + 1)),
    );
  }

  Future<void> wipe() => transaction(() async {
        await delete(paymentsOutbox).go();
        await delete(assignmentsLocal).go();
      });
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File(p.join(dir.path, 'collector.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}

final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});
