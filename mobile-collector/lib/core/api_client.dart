import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'auth_storage.dart';
import 'config.dart';

/// Authenticated Dio instance — automatically attaches the Sanctum bearer
/// token, fans 401s back to the auth flow, and wraps all responses in our
/// shared error envelope.
class ApiClient {
  ApiClient(this._auth) {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 30),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _auth.token();
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (err, handler) {
          if (err.response?.statusCode == 401) {
            _auth.clear();
          }
          handler.next(err);
        },
      ),
    );
  }

  late final Dio dio;
  final AuthStorage _auth;
}

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(authStorageProvider));
});
