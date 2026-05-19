import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api_client.dart';

/// Read-only ticket detail with a single "Mark complete" action.
///
/// Photo + signature capture for the completion proof are scaffolded but
/// gated behind a follow-up release — the existing payment recording
/// flow already handles image_picker + signature pad and that code can
/// be lifted in cleanly once we settle on what data the backend wants
/// stored on a ticket completion vs. a payment.
class TechnicianTicketDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const TechnicianTicketDetailScreen({super.key, required this.id});

  @override
  ConsumerState<TechnicianTicketDetailScreen> createState() =>
      _TechnicianTicketDetailScreenState();
}

class _TechnicianTicketDetailScreenState
    extends ConsumerState<TechnicianTicketDetailScreen> {
  Map<String, dynamic>? _ticket;
  bool _loading = true;
  bool _saving = false;
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
      final res = await api.dio.get('/api/v1/tickets/${widget.id}');
      if (!mounted) return;
      setState(() {
        _ticket = (res.data as Map<String, dynamic>)['data']
                as Map<String, dynamic>? ??
            res.data as Map<String, dynamic>;
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

  Future<void> _markDone() async {
    setState(() => _saving = true);
    try {
      final api = ref.read(apiClientProvider);
      await api.dio.patch(
        '/api/v1/tickets/${widget.id}',
        data: {'status': 'completed', 'completed_at': DateTime.now().toIso8601String()},
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Marked completed')),
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not save: $e')),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _row(String label, String? value) {
    if (value == null || value.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF6B7280),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = _ticket;
    final isDone = t != null && t['status'] == 'completed';
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ticket'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _load,
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
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.redAccent),
                      ),
                    ),
                  )
                : t == null
                    ? const Center(child: Text('Not found'))
                    : Column(
                        children: [
                          Expanded(
                            child: ListView(
                              padding: const EdgeInsets.all(16),
                              children: [
                                Text(
                                  (t['title'] as String?) ??
                                      (t['number'] as String?) ??
                                      'Ticket',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                _row('Number', t['number'] as String?),
                                _row(
                                  'Type',
                                  (t['type'] as String?)?.replaceAll('_', ' '),
                                ),
                                _row(
                                  'Priority',
                                  (t['priority'] as String?)
                                      ?.replaceAll('_', ' '),
                                ),
                                _row(
                                  'Status',
                                  (t['status'] as String?)
                                      ?.replaceAll('_', ' '),
                                ),
                                _row(
                                  'Scheduled',
                                  t['scheduled_at'] as String?,
                                ),
                                _row(
                                  'Customer',
                                  (t['customer'] as Map?)?['full_name']
                                      as String?,
                                ),
                                _row(
                                  'Phone',
                                  (t['customer'] as Map?)?['phone_primary']
                                      as String?,
                                ),
                                _row(
                                  'Address',
                                  (t['customer'] as Map?)?['address_line']
                                      as String?,
                                ),
                                const SizedBox(height: 8),
                                if (t['description'] != null) ...[
                                  const Text(
                                    'Description',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: Color(0xFF6B7280),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    t['description'].toString(),
                                    style: const TextStyle(fontSize: 13),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          if (!isDone)
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: FilledButton.icon(
                                onPressed: _saving ? null : _markDone,
                                icon: _saving
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Icon(Icons.check_circle),
                                label: const Text('Mark complete'),
                                style: FilledButton.styleFrom(
                                  minimumSize: const Size.fromHeight(52),
                                ),
                              ),
                            )
                          else
                            Padding(
                              padding: const EdgeInsets.all(16),
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: Colors.green.shade200,
                                  ),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(Icons.check_circle,
                                        color: Colors.green),
                                    SizedBox(width: 8),
                                    Text(
                                      'Completed',
                                      style: TextStyle(
                                        color: Colors.green,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                        ],
                      ),
      ),
    );
  }
}
