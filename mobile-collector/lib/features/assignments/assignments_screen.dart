import 'package:flutter/material.dart';
import 'package:isp_collector/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../core/database/app_database.dart';
import '../../core/locale_provider.dart';
import '../../core/services/background_sync.dart';
import '../../core/services/sync_service.dart';

final assignmentsStreamProvider =
    StreamProvider<List<AssignmentsLocalData>>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return db.watchAssignments();
});

final pendingOutboxProvider = StreamProvider<int>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return db.watchPendingCount();
});

/// Tiny model for the assignments-screen "cash on hand" chip. Only a couple
/// of fields needed; full model lives in handover_screen.dart.
class CashOnHandSummary {
  CashOnHandSummary({required this.amount, required this.count});
  final double amount;
  final int count;
}

final cashOnHandProvider = FutureProvider<CashOnHandSummary>((ref) async {
  final api = ref.watch(apiClientProvider);
  try {
    final res = await api.dio.get('/api/v1/collector/pending-cash');
    final d = (res.data['data'] as Map).cast<String, dynamic>();
    return CashOnHandSummary(
      amount: (d['expected_amount'] as num?)?.toDouble() ?? 0.0,
      count: (d['count'] as num?)?.toInt() ?? 0,
    );
  } catch (_) {
    // Offline or auth error — show zero so the chip stays hidden.
    return CashOnHandSummary(amount: 0, count: 0);
  }
});

class AssignmentsScreen extends ConsumerStatefulWidget {
  const AssignmentsScreen({super.key});

  @override
  ConsumerState<AssignmentsScreen> createState() => _AssignmentsScreenState();
}

class _AssignmentsScreenState extends ConsumerState<AssignmentsScreen> {
  bool _syncing = false;

  @override
  void initState() {
    super.initState();
    // Start the foreground sync loop the moment the collector lands here.
    // The provider is auto-disposed when the widget tree no longer holds a
    // ref (e.g. after logout), so the timer cleans itself up.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(syncServiceProvider).start();
      // Make sure the OS-managed periodic drain is registered. Idempotent
      // thanks to ExistingPeriodicWorkPolicy.keep, so this is safe to call
      // on every warm start.
      schedulePeriodicOutboxSync();
    });
  }

  Future<void> _manualSync() async {
    setState(() => _syncing = true);
    final ok = await ref.read(syncServiceProvider).syncAll();
    if (!mounted) return;
    setState(() => _syncing = false);
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    messenger.showSnackBar(
      SnackBar(
        content: Text(ok ? t.syncedOk : t.syncedErrors),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final assignments = ref.watch(assignmentsStreamProvider);
    final pending = ref.watch(pendingOutboxProvider).asData?.value ?? 0;
    final auth = ref.watch(authStorageProvider);
    final currentLocale = ref.watch(localeProvider)?.languageCode ?? 'en';

    return Scaffold(
      appBar: AppBar(
        leading: Padding(
          padding: const EdgeInsets.all(8),
          child: Image.asset('assets/images/logo.png', fit: BoxFit.contain),
        ),
        title: FutureBuilder<String?>(
          future: auth.userName(),
          builder: (_, snap) => Text(
            snap.hasData ? t.hi(snap.data!) : t.todaysRoute,
          ),
        ),
        actions: [
          IconButton(
            tooltip: t.cashHandover,
            icon: const Icon(Icons.account_balance_wallet),
            // Always available — handover screen handles the zero-cash case
            // gracefully so the collector can open it whenever they need.
            onPressed: () => context.push('/handover'),
          ),
          IconButton(
            tooltip: t.syncNow,
            icon: _syncing
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.sync),
            onPressed: _syncing ? null : _manualSync,
          ),
          PopupMenuButton<String>(
            tooltip: t.language,
            icon: const Icon(Icons.language),
            initialValue: currentLocale,
            onSelected: (code) =>
                ref.read(localeProvider.notifier).set(Locale(code)),
            itemBuilder: (_) => [
              CheckedPopupMenuItem(
                value: 'en',
                checked: currentLocale == 'en',
                child: Text(t.english),
              ),
              CheckedPopupMenuItem(
                value: 'ar',
                checked: currentLocale == 'ar',
                child: Text(t.arabic),
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: t.signOut,
            onPressed: () async {
              if (pending > 0) {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (_) => AlertDialog(
                    title: Text(t.pendingPaymentsTitle),
                    content: Text(t.pendingPaymentsBody(pending)),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(false),
                        child: Text(t.cancel),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(true),
                        child: Text(t.signOutAnyway),
                      ),
                    ],
                  ),
                );
                if (confirm != true) return;
              }
              await cancelPeriodicOutboxSync();
              await auth.clear();
              await ref.read(appDatabaseProvider).wipe();
              if (mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: Column(
        children: [
          if (pending > 0) _PendingBanner(count: pending),
          _CashOnHandBar(
            onTap: () => context.push('/handover'),
          ),
          Expanded(
            child: assignments.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('${t.couldNotLoadAssignments}\n\n$e'),
                ),
              ),
              data: (rows) => RefreshIndicator(
                onRefresh: () async {
                  await ref.read(syncServiceProvider).syncAll();
                },
                child: rows.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          const SizedBox(height: 80),
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Text(
                                t.noAssignmentsHelp,
                                textAlign: TextAlign.center,
                              ),
                            ),
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemBuilder: (_, i) => _AssignmentTile(rows[i]),
                        separatorBuilder: (_, __) =>
                            const Divider(height: 1, thickness: 0.5),
                        itemCount: rows.length,
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CashOnHandBar extends ConsumerWidget {
  const _CashOnHandBar({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final summary = ref.watch(cashOnHandProvider).asData?.value;
    if (summary == null || summary.count == 0) return const SizedBox.shrink();
    return InkWell(
      onTap: onTap,
      child: Container(
        width: double.infinity,
        color: Colors.green.shade50,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        child: Row(
          children: [
            Icon(Icons.account_balance_wallet,
                color: Colors.green.shade800, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                t.cashOnHand(
                  '\$${summary.amount.toStringAsFixed(2)}',
                  summary.count,
                ),
                style:
                    TextStyle(color: Colors.green.shade900, fontSize: 13),
              ),
            ),
            Text(
              t.handOverArrow,
              style: TextStyle(
                color: Colors.green.shade900,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PendingBanner extends StatelessWidget {
  const _PendingBanner({required this.count});
  final int count;

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Container(
      width: double.infinity,
      color: Colors.amber.shade100,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Icon(Icons.cloud_upload_outlined,
              color: Colors.amber.shade900, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              t.paymentsWaiting(count),
              style: TextStyle(color: Colors.amber.shade900, fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _AssignmentTile extends StatelessWidget {
  const _AssignmentTile(this.a);
  final AssignmentsLocalData a;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: _statusColor(a.status, context),
        child: Icon(
          _statusIcon(a.status),
          color: Colors.white,
          size: 20,
        ),
      ),
      title: Text(a.customerName,
          style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (a.address != null && a.address!.isNotEmpty)
            Text(a.address!, maxLines: 1, overflow: TextOverflow.ellipsis),
          Row(
            children: [
              if (a.serviceCategory != null) ...[
                Container(
                  margin: const EdgeInsets.only(right: 6, top: 2),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    a.serviceCategory!,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
              Text(
                '\$${a.totalDue.toStringAsFixed(2)} ${a.currency}',
                style: const TextStyle(
                    fontFamily: 'monospace', fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ],
      ),
      trailing: const Icon(Icons.chevron_right),
      onTap: () => context.push(
        '/customer/${a.customerId}?invoice=${a.invoiceId}',
      ),
    );
  }

  Color _statusColor(String status, BuildContext context) {
    switch (status) {
      case 'completed':
        return Colors.green;
      case 'failed':
        return Colors.red;
      case 'in_progress':
        return Colors.amber.shade700;
      default:
        return Theme.of(context).colorScheme.primary;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'completed':
        return Icons.check;
      case 'failed':
        return Icons.close;
      case 'in_progress':
        return Icons.directions_walk;
      default:
        return Icons.location_on;
    }
  }
}
