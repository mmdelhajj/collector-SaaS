import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:latlong2/latlong.dart';

import '../../core/api_client.dart';

class _LiveCollector {
  final int? id;
  final String name;
  final double lat;
  final double lng;
  final DateTime? lastPing;
  final bool isActive;
  final num totalCollected;

  const _LiveCollector({
    required this.id,
    required this.name,
    required this.lat,
    required this.lng,
    required this.lastPing,
    required this.isActive,
    required this.totalCollected,
  });

  factory _LiveCollector.fromJson(Map<String, dynamic> j) {
    final coll = j['collector'] as Map<String, dynamic>?;
    return _LiveCollector(
      id: coll?['id'] as int?,
      name: (coll?['name'] as String?) ?? 'Collector',
      lat: (j['latitude'] as num).toDouble(),
      lng: (j['longitude'] as num).toDouble(),
      lastPing: j['last_ping_at'] != null
          ? DateTime.tryParse(j['last_ping_at'] as String)
          : null,
      isActive: (j['is_active'] as bool?) ?? false,
      totalCollected: (j['total_collected'] as num?) ?? 0,
    );
  }
}

/// Same idea as the admin web Live Map — polls /api/v1/collector-live every
/// 10 seconds, draws each collector as a coloured marker on an OSM tile
/// layer. Tap a collector in the list to lock the camera onto them.
class AdminLiveMapScreen extends ConsumerStatefulWidget {
  const AdminLiveMapScreen({super.key});

  @override
  ConsumerState<AdminLiveMapScreen> createState() =>
      _AdminLiveMapScreenState();
}

class _AdminLiveMapScreenState extends ConsumerState<AdminLiveMapScreen> {
  static const Duration _pollInterval = Duration(seconds: 10);
  static const LatLng _defaultCenter = LatLng(33.8938, 35.5018); // Beirut
  static const double _defaultZoom = 11;
  static const double _focusZoom = 15;

  final MapController _mapController = MapController();
  Timer? _timer;
  List<_LiveCollector> _collectors = const [];
  String? _error;
  bool _loading = true;
  int? _focusedId;
  bool _hasFitOnce = false;

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(_pollInterval, (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(apiClientProvider);
      final res = await api.dio.get('/api/v1/collector-live');
      final data = (res.data as Map<String, dynamic>)['data'] as List;
      final parsed = data
          .map((e) => _LiveCollector.fromJson(e as Map<String, dynamic>))
          .toList();
      if (!mounted) return;
      setState(() {
        _collectors = parsed;
        _error = null;
        _loading = false;
      });
      _autoCenter(parsed);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  void _autoCenter(List<_LiveCollector> list) {
    if (_focusedId != null) {
      final target = list.firstWhere(
        (c) => c.id == _focusedId,
        orElse: () => list.isNotEmpty
            ? list.first
            : const _LiveCollector(
                id: null,
                name: '',
                lat: 33.8938,
                lng: 35.5018,
                lastPing: null,
                isActive: false,
                totalCollected: 0,
              ),
      );
      _mapController.move(LatLng(target.lat, target.lng), _focusZoom);
      return;
    }
    if (_hasFitOnce) return;
    final active = list.where((c) => c.isActive).toList();
    final source = active.isNotEmpty ? active : list;
    if (source.isEmpty) return;
    _hasFitOnce = true;
    if (source.length == 1) {
      _mapController.move(
        LatLng(source.first.lat, source.first.lng),
        _defaultZoom,
      );
      return;
    }
    final points = source.map((c) => LatLng(c.lat, c.lng)).toList();
    final bounds = LatLngBounds.fromPoints(points);
    _mapController.fitCamera(
      CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(40)),
    );
  }

  void _focus(int? id) {
    setState(() {
      _focusedId = id == _focusedId ? null : id;
      if (_focusedId == null) _hasFitOnce = false;
    });
    _autoCenter(_collectors);
  }

  String _timeAgo(DateTime? t) {
    if (t == null) return '—';
    final s = DateTime.now().difference(t).inSeconds;
    if (s < 60) return '${s}s ago';
    final m = s ~/ 60;
    if (m < 60) return '${m}m ago';
    final h = m ~/ 60;
    return '${h}h ago';
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _collectors.where((c) => c.isActive).length;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Live map'),
        actions: [
          if (_focusedId != null)
            IconButton(
              icon: const Icon(Icons.close),
              tooltip: 'Stop following',
              onPressed: () => _focus(null),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            _StatusBar(
              activeCount: activeCount,
              total: _collectors.length,
              error: _error,
            ),
            Expanded(
              flex: 3,
              child: _loading && _collectors.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : FlutterMap(
                      mapController: _mapController,
                      options: const MapOptions(
                        initialCenter: _defaultCenter,
                        initialZoom: _defaultZoom,
                      ),
                      children: [
                        TileLayer(
                          urlTemplate:
                              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          userAgentPackageName:
                              'com.runcollect.ispCollector',
                        ),
                        MarkerLayer(
                          markers: _collectors
                              .map(
                                (c) => Marker(
                                  point: LatLng(c.lat, c.lng),
                                  width: 28,
                                  height: 28,
                                  child: GestureDetector(
                                    onTap: () => _focus(c.id),
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: c.isActive
                                            ? Colors.green
                                            : Colors.grey,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: c.id == _focusedId
                                              ? Colors.lightBlue
                                              : Colors.white,
                                          width: c.id == _focusedId ? 4 : 3,
                                        ),
                                        boxShadow: const [
                                          BoxShadow(
                                            blurRadius: 6,
                                            color: Colors.black26,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              )
                              .toList(),
                        ),
                      ],
                    ),
            ),
            const Divider(height: 1),
            Expanded(
              flex: 2,
              child: _collectors.isEmpty
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: Text(
                          'No collectors on duty yet today.',
                          style: TextStyle(color: Color(0xFF6B7280)),
                        ),
                      ),
                    )
                  : ListView.separated(
                      itemCount: _collectors.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final c = _collectors[i];
                        final focused = c.id == _focusedId;
                        return ListTile(
                          dense: true,
                          tileColor:
                              focused ? const Color(0xFFE0F2FE) : null,
                          leading: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: c.isActive
                                  ? Colors.green
                                  : Colors.grey,
                              shape: BoxShape.circle,
                            ),
                          ),
                          title: Text(
                            c.name,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          subtitle: Text(
                            '${_timeAgo(c.lastPing)} · \$${c.totalCollected.toStringAsFixed(2)}',
                            style: const TextStyle(fontSize: 11),
                          ),
                          trailing: focused
                              ? const Icon(
                                  Icons.gps_fixed,
                                  size: 16,
                                  color: Colors.lightBlue,
                                )
                              : null,
                          onTap: () => _focus(c.id),
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

class _StatusBar extends StatelessWidget {
  final int activeCount;
  final int total;
  final String? error;
  const _StatusBar({
    required this.activeCount,
    required this.total,
    required this.error,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: const BoxDecoration(
        color: Color(0xFFF9FAFB),
        border: Border(bottom: BorderSide(color: Color(0xFFE5E7EB))),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.green,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '$activeCount active',
            style: const TextStyle(fontSize: 12),
          ),
          const SizedBox(width: 16),
          Container(
            width: 8,
            height: 8,
            decoration: const BoxDecoration(
              color: Colors.grey,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            '${total - activeCount} ended',
            style: const TextStyle(fontSize: 12),
          ),
          const Spacer(),
          Icon(
            error == null ? Icons.wifi : Icons.wifi_off,
            size: 14,
            color: error == null ? Colors.green : Colors.redAccent,
          ),
          const SizedBox(width: 4),
          Text(
            error == null ? 'Live' : 'Offline',
            style: TextStyle(
              fontSize: 11,
              color: error == null ? Colors.green : Colors.redAccent,
            ),
          ),
        ],
      ),
    );
  }
}
