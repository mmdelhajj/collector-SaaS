import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';

class Assignment {
  final int id;
  final String invoiceId;
  final String customerId;
  final String customerName;
  final String? customerPhone;
  final String? address;
  final double totalDue;
  final String currency;
  final String status;
  final String? serviceCategory;

  Assignment({
    required this.id,
    required this.invoiceId,
    required this.customerId,
    required this.customerName,
    this.customerPhone,
    this.address,
    required this.totalDue,
    required this.currency,
    required this.status,
    this.serviceCategory,
  });

  factory Assignment.fromJson(Map<String, dynamic> j) {
    final inv = j['invoice'] as Map<String, dynamic>?;
    final cust = inv?['customer'] as Map<String, dynamic>?;
    return Assignment(
      id: j['id'] as int,
      invoiceId: inv?['id']?.toString() ?? '',
      customerId: cust?['id']?.toString() ?? '',
      customerName: cust?['full_name']?.toString() ?? 'Unknown',
      customerPhone: cust?['phone_primary'] as String?,
      address: cust?['address_line'] as String?,
      totalDue: (inv?['balance_due'] as num?)?.toDouble() ?? 0.0,
      currency: 'USD',
      status: j['status']?.toString() ?? 'pending',
      serviceCategory: (inv?['service_category']
          as Map<String, dynamic>?)?['name'] as String?,
    );
  }
}

final assignmentsProvider = FutureProvider<List<Assignment>>((ref) async {
  final api = ref.watch(apiClientProvider);
  final res = await api.dio.get('/api/v1/collector/my-assignments');
  final list = (res.data['data'] as List).cast<Map<String, dynamic>>();
  return list.map(Assignment.fromJson).toList();
});

class AssignmentsScreen extends ConsumerWidget {
  const AssignmentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final assignments = ref.watch(assignmentsProvider);
    final auth = ref.watch(authStorageProvider);

    return Scaffold(
      appBar: AppBar(
        title: FutureBuilder<String?>(
          future: auth.userName(),
          builder: (_, snap) => Text(
            snap.hasData ? 'Hi, ${snap.data}' : "Today's route",
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(assignmentsProvider),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await auth.clear();
              if (context.mounted) context.go('/login');
            },
          ),
        ],
      ),
      body: assignments.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('Could not load assignments.\n\n$e'),
          ),
        ),
        data: (rows) => RefreshIndicator(
          onRefresh: () async => ref.refresh(assignmentsProvider.future),
          child: rows.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('No assignments today. 🎉'),
                  ),
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
    );
  }
}

class _AssignmentTile extends StatelessWidget {
  const _AssignmentTile(this.a);
  final Assignment a;

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
            Text(a.address!,
                maxLines: 1, overflow: TextOverflow.ellipsis),
          Row(
            children: [
              if (a.serviceCategory != null) ...[
                Container(
                  margin: const EdgeInsets.only(right: 6, top: 2),
                  padding: const EdgeInsets.symmetric(
                      horizontal: 6, vertical: 1),
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
        '/record/${a.invoiceId}/${a.customerId}',
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
