import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Tenant roles as they exist on the Laravel backend. The app uses these to
/// decide which home screen to show after login and which navigation entries
/// the user is allowed to reach.
///
/// Backend canonical list (Spatie permission roles seeded per tenant):
///   tenant_owner | tenant_admin | manager | accountant | support
///   technician  | collector    | customer
enum AppRole {
  tenantOwner,
  tenantAdmin,
  manager,
  accountant,
  support,
  technician,
  collector,
  customer,
  unknown;

  static AppRole fromString(String value) {
    switch (value) {
      case 'tenant_owner':
        return AppRole.tenantOwner;
      case 'tenant_admin':
        return AppRole.tenantAdmin;
      case 'manager':
        return AppRole.manager;
      case 'accountant':
        return AppRole.accountant;
      case 'support':
        return AppRole.support;
      case 'technician':
        return AppRole.technician;
      case 'collector':
        return AppRole.collector;
      case 'customer':
        return AppRole.customer;
      default:
        return AppRole.unknown;
    }
  }

  String get key {
    switch (this) {
      case AppRole.tenantOwner:
        return 'tenant_owner';
      case AppRole.tenantAdmin:
        return 'tenant_admin';
      case AppRole.manager:
        return 'manager';
      case AppRole.accountant:
        return 'accountant';
      case AppRole.support:
        return 'support';
      case AppRole.technician:
        return 'technician';
      case AppRole.collector:
        return 'collector';
      case AppRole.customer:
        return 'customer';
      case AppRole.unknown:
        return 'unknown';
    }
  }

  /// Owner / admin / manager — anyone who runs the workspace.
  bool get isAdminLevel =>
      this == AppRole.tenantOwner ||
      this == AppRole.tenantAdmin ||
      this == AppRole.manager;

  /// "Office" roles that don't have a dedicated native screen yet — they
  /// land on the open-web launcher.
  bool get isWebOnly =>
      this == AppRole.accountant || this == AppRole.support;
}

/// Pick the "primary" role from a list — used to decide which home screen
/// to land on after sign-in. Order matters: more-privileged roles win so
/// an owner who's also flagged "support" doesn't end up on the support
/// landing.
AppRole pickPrimaryRole(List<AppRole> roles) {
  const priority = [
    AppRole.tenantOwner,
    AppRole.tenantAdmin,
    AppRole.manager,
    AppRole.collector,
    AppRole.technician,
    AppRole.accountant,
    AppRole.support,
    AppRole.customer,
  ];
  for (final p in priority) {
    if (roles.contains(p)) return p;
  }
  return AppRole.unknown;
}

/// Securely persists the Sanctum bearer token + user id + role list across
/// launches.
class AuthStorage {
  static const _kToken = 'auth_token';
  static const _kUserId = 'auth_user_id';
  static const _kUserName = 'auth_user_name';
  static const _kRoles = 'auth_roles';

  final _storage = const FlutterSecureStorage();

  Future<String?> token() => _storage.read(key: _kToken);
  Future<int?> userId() async {
    final v = await _storage.read(key: _kUserId);
    return v == null ? null : int.tryParse(v);
  }

  Future<String?> userName() => _storage.read(key: _kUserName);

  Future<List<AppRole>> roles() async {
    final raw = await _storage.read(key: _kRoles);
    if (raw == null || raw.isEmpty) return const [];
    return raw
        .split(',')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .map(AppRole.fromString)
        .toList();
  }

  /// Convenience for routers / guards. Returns [AppRole.unknown] if no
  /// role has been persisted yet (e.g. legacy install with no role data).
  Future<AppRole> primaryRole() async {
    final list = await roles();
    if (list.isEmpty) return AppRole.unknown;
    return pickPrimaryRole(list);
  }

  Future<void> save({
    required String token,
    required int userId,
    required String userName,
    List<String>? roles,
  }) async {
    await _storage.write(key: _kToken, value: token);
    await _storage.write(key: _kUserId, value: '$userId');
    await _storage.write(key: _kUserName, value: userName);
    if (roles != null) {
      await _storage.write(key: _kRoles, value: roles.join(','));
    }
  }

  /// Update only the stored role list — used right after login when
  /// `/auth/me` fills in the roles that `/auth/login` doesn't return.
  Future<void> saveRoles(List<String> roles) async {
    await _storage.write(key: _kRoles, value: roles.join(','));
  }

  Future<void> clear() async {
    await _storage.delete(key: _kToken);
    await _storage.delete(key: _kUserId);
    await _storage.delete(key: _kUserName);
    await _storage.delete(key: _kRoles);
  }
}

final authStorageProvider = Provider<AuthStorage>((_) => AuthStorage());
