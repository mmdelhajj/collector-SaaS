import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';

class _CustomerHit {
  final String id;
  final String? code;
  final String name;
  final String? phone;
  final String? city;
  final String? status;
  final num? balanceDue;

  const _CustomerHit({
    required this.id,
    required this.code,
    required this.name,
    required this.phone,
    required this.city,
    required this.status,
    required this.balanceDue,
  });

  factory _CustomerHit.fromJson(Map<String, dynamic> j) {
    return _CustomerHit(
      id: j['id'].toString(),
      code: j['code'] as String?,
      name: (j['full_name'] as String?) ??
          ('${j['first_name'] ?? ''} ${j['last_name'] ?? ''}').trim(),
      phone: j['phone_primary'] as String?,
      city: j['city'] as String?,
      status: j['status'] as String?,
      balanceDue: j['balance_due'] as num?,
    );
  }
}

/// Type-to-search across customers for admin/manager roles.
///
/// Debounced 400ms — `/api/v1/customers?search=…` does name/phone/code
/// matching server-side and returns a paginated list; we show the first
/// 25 hits and tell the user to refine if there are more.
class AdminCustomerSearchScreen extends ConsumerStatefulWidget {
  const AdminCustomerSearchScreen({super.key});

  @override
  ConsumerState<AdminCustomerSearchScreen> createState() =>
      _AdminCustomerSearchScreenState();
}

class _AdminCustomerSearchScreenState
    extends ConsumerState<AdminCustomerSearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  List<_CustomerHit> _hits = const [];
  bool _loading = false;
  String? _error;
  int? _total;

  @override
  void dispose() {
    _controller.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    if (value.trim().length < 2) {
      setState(() {
        _hits = const [];
        _total = null;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 400), () => _run(value));
  }

  Future<void> _run(String value) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.dio.get(
        '/api/v1/customers',
        queryParameters: {'search': value, 'per_page': 25},
      );
      final body = res.data as Map<String, dynamic>;
      final data = (body['data'] as List)
          .map((e) => _CustomerHit.fromJson(e as Map<String, dynamic>))
          .toList();
      final meta = body['meta'] as Map<String, dynamic>?;
      if (!mounted) return;
      setState(() {
        _hits = data;
        _total = meta?['total'] as int?;
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

  Color _statusColor(String? s) {
    switch (s) {
      case 'active':
        return Colors.green;
      case 'suspended':
        return Colors.orange;
      case 'terminated':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Find customer')),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: TextField(
                controller: _controller,
                autofocus: true,
                onChanged: _onChanged,
                decoration: const InputDecoration(
                  hintText: 'Name, phone, or code',
                  prefixIcon: Icon(Icons.search),
                  border: OutlineInputBorder(),
                ),
              ),
            ),
            if (_loading) const LinearProgressIndicator(minHeight: 2),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(
                  _error!,
                  style: const TextStyle(color: Colors.redAccent),
                ),
              ),
            if (_total != null && _total! > _hits.length)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Text(
                  'Showing ${_hits.length} of $_total — refine to narrow.',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF6B7280),
                  ),
                ),
              ),
            Expanded(
              child: _hits.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text(
                          'Type at least 2 characters to search.',
                          style: TextStyle(color: Color(0xFF6B7280)),
                        ),
                      ),
                    )
                  : ListView.separated(
                      itemCount: _hits.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final c = _hits[i];
                        return ListTile(
                          title: Text(
                            c.name,
                            style:
                                const TextStyle(fontWeight: FontWeight.w500),
                          ),
                          subtitle: Text(
                            [
                              if (c.code != null) c.code,
                              if (c.phone != null) c.phone,
                              if (c.city != null) c.city,
                            ].whereType<String>().join(' · '),
                            style: const TextStyle(fontSize: 11),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (c.balanceDue != null &&
                                  c.balanceDue! > 0) ...[
                                Text(
                                  '\$${c.balanceDue!.toStringAsFixed(2)}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: c.balanceDue! > 0
                                        ? Colors.orange.shade700
                                        : null,
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              Container(
                                width: 10,
                                height: 10,
                                decoration: BoxDecoration(
                                  color: _statusColor(c.status),
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ],
                          ),
                          onTap: () {
                            // Reuse the collector customer-detail screen
                            // which already handles read-only invoice + payment
                            // history. Admin permission is implicit (they
                            // already passed the role guard).
                            Navigator.of(context).pushNamed(
                              '/customer/${c.id}',
                            );
                          },
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
