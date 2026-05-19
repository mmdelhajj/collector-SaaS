import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_client.dart';
import '../../core/auth_storage.dart';

class _Ticket {
  final String id;
  final String? number;
  final String? title;
  final String? type;
  final String? priority;
  final String? status;
  final DateTime? scheduledAt;
  final Map<String, dynamic>? customer;

  const _Ticket({
    required this.id,
    required this.number,
    required this.title,
    required this.type,
    required this.priority,
    required this.status,
    required this.scheduledAt,
    required this.customer,
  });

  factory _Ticket.fromJson(Map<String, dynamic> j) {
    return _Ticket(
      id: j['id'].toString(),
      number: j['number'] as String?,
      title: j['title'] as String?,
      type: j['type'] as String?,
      priority: j['priority'] as String?,
      status: j['status'] as String?,
      scheduledAt: j['scheduled_at'] != null
          ? DateTime.tryParse(j['scheduled_at'] as String)
          : null,
      customer: j['customer'] is Map
          ? Map<String, dynamic>.from(j['customer'] as Map)
          : null,
    );
  }
}

/// Technician landing — today's assigned tickets.
///
/// Filters server-side on `assigned_to_user_id = me`. Pull-to-refresh
/// reloads. Tap a ticket to drill into the detail screen with check-in,
/// photo + signature capture, and "Mark done".
class TechnicianTicketsScreen extends ConsumerStatefulWidget {
  const TechnicianTicketsScreen({super.key});

  @override
  ConsumerState<TechnicianTicketsScreen> createState() =>
      _TechnicianTicketsScreenState();
}

class _TechnicianTicketsScreenState
    extends ConsumerState<TechnicianTicketsScreen> {
  List<_Ticket> _tickets = const [];
  bool _loading = true;
  String? _error;

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
      final uid = await ref.read(authStorageProvider).userId();
      final res = await api.dio.get(
        '/api/v1/tickets',
        queryParameters: {
          if (uid != null) 'filter[assigned_to_user_id]': uid,
          'per_page': 50,
          'sort': 'scheduled_at',
        },
      );
      final body = res.data as Map<String, dynamic>;
      final list = (body['data'] as List)
          .map((e) => _Ticket.fromJson(e as Map<String, dynamic>))
          .toList();
      if (!mounted) return;
      setState(() {
        _tickets = list;
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

  Future<void> _signOut() async {
    await ref.read(authStorageProvider).clear();
    if (!mounted) return;
    context.go('/login');
  }

  Color _priorityColor(String? p) {
    switch (p) {
      case 'urgent':
      case 'high':
        return Colors.red;
      case 'medium':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  Color _statusBg(String? s) {
    switch (s) {
      case 'completed':
        return Colors.green.shade100;
      case 'in_progress':
        return Colors.blue.shade100;
      case 'cancelled':
        return Colors.grey.shade200;
      default:
        return Colors.amber.shade100;
    }
  }

  Color _statusFg(String? s) {
    switch (s) {
      case 'completed':
        return Colors.green.shade800;
      case 'in_progress':
        return Colors.blue.shade800;
      case 'cancelled':
        return Colors.grey.shade700;
      default:
        return Colors.amber.shade800;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My tickets'),
        actions: [
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
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 48,
                            color: Colors.redAccent,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 12,
                              color: Color(0xFF6B7280),
                            ),
                          ),
                          const SizedBox(height: 16),
                          FilledButton.icon(
                            onPressed: _load,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Try again'),
                          ),
                        ],
                      ),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _load,
                    child: _tickets.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 80),
                              Center(
                                child: Padding(
                                  padding: EdgeInsets.all(24),
                                  child: Text(
                                    'No tickets assigned to you yet.',
                                    style: TextStyle(
                                      color: Color(0xFF6B7280),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          )
                        : ListView.separated(
                            itemCount: _tickets.length,
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            separatorBuilder: (_, __) =>
                                const Divider(height: 1),
                            itemBuilder: (_, i) {
                              final t = _tickets[i];
                              return ListTile(
                                onTap: () =>
                                    context.push('/jobs/${t.id}'),
                                leading: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    color: _priorityColor(t.priority)
                                        .withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    Icons.build_circle_outlined,
                                    color: _priorityColor(t.priority),
                                  ),
                                ),
                                title: Text(
                                  t.title ?? t.number ?? 'Ticket',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w500,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                subtitle: Text(
                                  [
                                    if (t.customer?['full_name'] != null)
                                      t.customer!['full_name'],
                                    if (t.type != null) t.type,
                                  ].whereType<String>().join(' · '),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 12),
                                ),
                                trailing: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: _statusBg(t.status),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    (t.status ?? 'pending')
                                        .replaceAll('_', ' '),
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: _statusFg(t.status),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
      ),
    );
  }
}
