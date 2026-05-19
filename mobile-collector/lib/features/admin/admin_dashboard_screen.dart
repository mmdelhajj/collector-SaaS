import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../core/config.dart';

class _DashboardData {
  final num collectedToday;
  final num collectedThisMonth;
  final num totalOutstanding;
  final num overdueOutstanding;
  final int activeCustomers;
  final int suspendedCustomers;
  final int openInvoices;
  final int overdue30Plus;
  final List<Map<String, dynamic>> collectorsToday;
  final List<Map<String, dynamic>> recentActivity;
  final double? momChangePct;

  const _DashboardData({
    required this.collectedToday,
    required this.collectedThisMonth,
    required this.totalOutstanding,
    required this.overdueOutstanding,
    required this.activeCustomers,
    required this.suspendedCustomers,
    required this.openInvoices,
    required this.overdue30Plus,
    required this.collectorsToday,
    required this.recentActivity,
    required this.momChangePct,
  });

  factory _DashboardData.fromJson(Map<String, dynamic> j) {
    return _DashboardData(
      collectedToday: (j['collected_today'] as num?) ?? 0,
      collectedThisMonth: (j['collected_this_month'] as num?) ?? 0,
      totalOutstanding: (j['total_outstanding'] as num?) ?? 0,
      overdueOutstanding: (j['overdue_outstanding'] as num?) ?? 0,
      activeCustomers: (j['active_customers'] as int?) ?? 0,
      suspendedCustomers: (j['suspended_customers'] as int?) ?? 0,
      openInvoices: (j['open_invoices'] as int?) ?? 0,
      overdue30Plus: (j['overdue_30_plus'] as int?) ?? 0,
      collectorsToday: ((j['collectors_today'] as List?) ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      recentActivity: ((j['recent_activity'] as List?) ?? [])
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList(),
      momChangePct: (j['mom_change_pct'] as num?)?.toDouble(),
    );
  }
}

/// Manager / Owner / Admin landing screen.
///
/// One call to `/api/v1/reports/dashboard` populates every KPI tile and
/// the bottom collectors-today list. The map link punches over to the
/// dedicated live-tracking screen which reuses the existing backend
/// `/collector-live` endpoint.
class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  _DashboardData? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.dio.get('/api/v1/reports/dashboard');
      if (!mounted) return;
      setState(() {
        _data = _DashboardData.fromJson(res.data as Map<String, dynamic>);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _money(num n) {
    final s = n.toStringAsFixed(2);
    final parts = s.split('.');
    final whole = parts[0].replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
    return '\$$whole.${parts[1]}';
  }

  Future<void> _openWeb() async {
    await launchUrl(
      Uri.parse(AppConfig.apiBaseUrl),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> _signOut() async {
    await ref.read(authStorageProvider).clear();
    if (!mounted) return;
    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_new),
            tooltip: 'Open admin web',
            onPressed: _openWeb,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: _signOut,
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? _ErrorView(message: _error!, onRetry: _load)
                : RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        _QuickActions(),
                        const SizedBox(height: 16),
                        _KpiGrid(data: _data!, money: _money),
                        const SizedBox(height: 16),
                        _CollectorsToday(
                          collectors: _data!.collectorsToday,
                          money: _money,
                        ),
                        const SizedBox(height: 16),
                        _RecentActivity(items: _data!.recentActivity),
                      ],
                    ),
                  ),
      ),
    );
  }
}

class _QuickActions extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: FilledButton.tonalIcon(
            onPressed: () => context.push('/admin/live'),
            icon: const Icon(Icons.radar),
            label: const Text('Live map'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: FilledButton.tonalIcon(
            onPressed: () => context.push('/admin/search'),
            icon: const Icon(Icons.search),
            label: const Text('Find customer'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
          ),
        ),
      ],
    );
  }
}

class _KpiGrid extends StatelessWidget {
  final _DashboardData data;
  final String Function(num) money;
  const _KpiGrid({required this.data, required this.money});

  @override
  Widget build(BuildContext context) {
    final tiles = <_KpiTile>[
      _KpiTile(
        label: 'Collected today',
        value: money(data.collectedToday),
        accent: Colors.green.shade600,
      ),
      _KpiTile(
        label: 'Outstanding',
        value: money(data.totalOutstanding),
        accent: Colors.orange.shade700,
        sub: data.overdueOutstanding > 0
            ? '${money(data.overdueOutstanding)} overdue'
            : null,
      ),
      _KpiTile(
        label: 'Open invoices',
        value: data.openInvoices.toString(),
        sub: data.overdue30Plus > 0
            ? '${data.overdue30Plus} aged 30d+'
            : null,
      ),
      _KpiTile(
        label: 'Active customers',
        value: data.activeCustomers.toString(),
        sub: data.suspendedCustomers > 0
            ? '${data.suspendedCustomers} suspended'
            : null,
      ),
    ];
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 10,
      crossAxisSpacing: 10,
      childAspectRatio: 1.5,
      children: tiles,
    );
  }
}

class _KpiTile extends StatelessWidget {
  final String label;
  final String value;
  final String? sub;
  final Color? accent;
  const _KpiTile({
    required this.label,
    required this.value,
    this.sub,
    this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 12,
              color: Color(0xFF6B7280),
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w700,
              color: accent ?? const Color(0xFF111827),
            ),
          ),
          if (sub != null)
            Text(
              sub!,
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF9CA3AF),
              ),
            )
          else
            const SizedBox(height: 0),
        ],
      ),
    );
  }
}

class _CollectorsToday extends StatelessWidget {
  final List<Map<String, dynamic>> collectors;
  final String Function(num) money;
  const _CollectorsToday({required this.collectors, required this.money});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Row(
              children: [
                const Text(
                  'Collectors today',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                TextButton(
                  onPressed: () => context.push('/admin/live'),
                  child: const Text('Map'),
                ),
              ],
            ),
          ),
          if (collectors.isEmpty)
            const Padding(
              padding: EdgeInsets.fromLTRB(14, 0, 14, 14),
              child: Text(
                'No collectors on duty yet.',
                style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
              ),
            )
          else
            ...collectors.map(
              (c) => Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: const BoxDecoration(
                  border: Border(
                    top: BorderSide(color: Color(0xFFF3F4F6)),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color:
                            (c['status'] == 'active' || c['status'] == 'on_duty')
                                ? Colors.green
                                : Colors.grey,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            (c['name'] as String?) ?? 'Collector',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            '${c['completed'] ?? 0}/${c['progress'] ?? c['total'] ?? 0} done',
                            style: const TextStyle(
                              fontSize: 11,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      money((c['collected_today'] as num?) ?? 0),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        fontFamily: 'monospace',
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

class _RecentActivity extends StatelessWidget {
  final List<Map<String, dynamic>> items;
  const _RecentActivity({required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(14, 12, 14, 8),
            child: Text(
              'Recent activity',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
            ),
          ),
          ...items.take(8).map(
                (a) => Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 8,
                  ),
                  decoration: const BoxDecoration(
                    border: Border(
                      top: BorderSide(color: Color(0xFFF3F4F6)),
                    ),
                  ),
                  child: Text(
                    '${a['action'] ?? ''} — ${a['user']?['name'] ?? ''}',
                    style: const TextStyle(fontSize: 12),
                  ),
                ),
              ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text(
              'Could not load dashboard.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
            ),
          ],
        ),
      ),
    );
  }
}
