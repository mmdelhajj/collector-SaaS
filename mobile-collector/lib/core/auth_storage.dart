import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Securely persists the Sanctum bearer token + user id across launches.
class AuthStorage {
  static const _kToken = 'auth_token';
  static const _kUserId = 'auth_user_id';
  static const _kUserName = 'auth_user_name';

  final _storage = const FlutterSecureStorage();

  Future<String?> token() => _storage.read(key: _kToken);
  Future<int?> userId() async {
    final v = await _storage.read(key: _kUserId);
    return v == null ? null : int.tryParse(v);
  }

  Future<String?> userName() => _storage.read(key: _kUserName);

  Future<void> save({
    required String token,
    required int userId,
    required String userName,
  }) async {
    await _storage.write(key: _kToken, value: token);
    await _storage.write(key: _kUserId, value: '$userId');
    await _storage.write(key: _kUserName, value: userName);
  }

  Future<void> clear() async {
    await _storage.delete(key: _kToken);
    await _storage.delete(key: _kUserId);
    await _storage.delete(key: _kUserName);
  }
}

final authStorageProvider = Provider<AuthStorage>((_) => AuthStorage());
