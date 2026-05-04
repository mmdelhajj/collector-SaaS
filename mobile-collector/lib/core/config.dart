/// Build-time API base URL. Override at build with:
///   flutter build apk --dart-define=API_BASE_URL=https://api.your-domain.com
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8000', // Android emulator → host machine
  );

  /// Polling interval for the live-location ping when on the road.
  static const Duration pingInterval = Duration(seconds: 30);

  /// Max distance (meters) between collector and customer to allow recording
  /// a payment. Mirrors the server-side "geofence" defence.
  static const double paymentGeofenceMeters = 200;
}
