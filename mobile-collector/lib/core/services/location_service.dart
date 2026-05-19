import 'dart:async';
import 'dart:developer' as dev;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../api_client.dart';

/// Foreground GPS ping loop. Sends the collector's current location to
/// `POST /api/v1/collector/ping` every 60 seconds while the user is signed in.
///
/// The companion admin view at `runcollect.com/collectors/live` polls
/// `/api/v1/collector-live` every 10 seconds and shows each collector as a
/// green pin (active = ping within the last 5 minutes) or grey (idle).
///
/// Foreground-only by design — no background-mode entitlement on iOS, no
/// foreground service on Android. The collector is expected to keep the app
/// open while on duty, which matches actual field usage (they're constantly
/// looking at today's list anyway).
class LocationService {
  LocationService(this._api);

  final ApiClient _api;

  Timer? _timer;
  bool _running = false;

  static const Duration _pingInterval = Duration(seconds: 60);

  bool get isRunning => _running;

  /// Starts the periodic ping loop. Safe to call multiple times — second and
  /// later calls are no-ops while the loop is already running. Requests
  /// location permission on first start; if denied, the loop stays off and
  /// returns `false` so the caller can surface a UI hint.
  Future<bool> start() async {
    if (_running) return true;

    final ok = await _ensurePermission();
    if (!ok) return false;

    _running = true;

    // Fire one immediately so the admin map sees the collector go green
    // without waiting a full minute.
    unawaited(_pingOnce());

    _timer = Timer.periodic(_pingInterval, (_) => _pingOnce());
    return true;
  }

  /// Stops the loop. Idempotent.
  void stop() {
    _timer?.cancel();
    _timer = null;
    _running = false;
  }

  Future<bool> _ensurePermission() async {
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) return false;

    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    return perm == LocationPermission.always ||
        perm == LocationPermission.whileInUse;
  }

  Future<void> _pingOnce() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 20),
      );
      await _api.dio.post(
        '/api/v1/collector/ping',
        data: {
          'latitude': pos.latitude,
          'longitude': pos.longitude,
        },
      );
    } catch (e) {
      // Network blips and brief GPS-fix failures are routine in the field;
      // log and retry on the next tick rather than tearing down the loop.
      dev.log('location ping failed: $e', name: 'LocationService');
    }
  }
}

final locationServiceProvider = Provider<LocationService>((ref) {
  final api = ref.watch(apiClientProvider);
  final service = LocationService(api);
  ref.onDispose(service.stop);
  return service;
});
