import 'dart:async';

import 'package:flutter/material.dart';
import 'package:isp_collector/l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';
import '../../core/services/background_sync.dart';
import '../../core/services/location_service.dart';
import '../../shared/widgets/language_toggle.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _twoFactor = TextEditingController();
  bool _loading = false;
  bool _showTwoFactor = false;
  String? _error;

  Future<void> _signIn() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final api = ref.read(apiClientProvider);
    final auth = ref.read(authStorageProvider);
    try {
      final body = {
        'email': _email.text.trim(),
        'password': _password.text,
        'device_name': 'Collector App',
        if (_showTwoFactor) 'two_factor_code': _twoFactor.text.trim(),
      };
      final res = await api.dio.post('/api/v1/auth/login', data: body);
      final data = res.data as Map<String, dynamic>;
      final user = data['user'] as Map<String, dynamic>;
      // /auth/login doesn't return the user's roles — only /auth/me does.
      // Save token first so the interceptor can attach it, then fetch
      // roles in a follow-up call. Failure to fetch roles is non-fatal
      // (user lands on a "pick a role" fallback screen we never want to
      // see; better than blocking sign-in over a transient blip).
      await auth.save(
        token: data['token'] as String,
        userId: user['id'] as int,
        userName: user['name'] as String,
      );
      try {
        final me = await api.dio.get('/api/v1/auth/me');
        final meUser = (me.data as Map<String, dynamic>)['user']
            as Map<String, dynamic>?;
        final roles = (meUser?['roles'] as List?)
                ?.map((r) => r.toString())
                .toList() ??
            const <String>[];
        await auth.saveRoles(roles);
      } catch (_) {
        // ignored — fallback role logic in router handles unknown
      }
      // Kick off the OS-managed background drain so payments queued offline
      // sync even if the collector closes the app or locks the phone.
      await schedulePeriodicOutboxSync();
      // Start the live-tracking ping loop so this collector shows up on the
      // admin live map. Fire-and-forget — if location permission is denied
      // or the user isn't a collector, the service stays off and we don't
      // block sign-in.
      unawaited(ref.read(locationServiceProvider).start());
      if (!mounted) return;
      context.go('/');
    } catch (e) {
      final msg = _extractError(e);
      final t = AppLocalizations.of(context);
      setState(() {
        if (msg == 'two_factor_required') {
          _showTwoFactor = true;
          _error = t.enterAuthCode;
        } else {
          _error = msg ?? t.loginFailed;
        }
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  String? _extractError(Object e) {
    if (e is! Object) return null;
    try {
      // ignore: avoid_dynamic_calls
      final data = (e as dynamic).response?.data;
      if (data is Map) {
        final errors = data['errors'];
        if (errors is Map && errors['two_factor_code'] is List) {
          return errors['two_factor_code'].first as String;
        }
        if (data['message'] is String) return data['message'] as String;
      }
    } catch (_) {}
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Image.asset(
                    'assets/images/logo.png',
                    width: 96,
                    height: 96,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    t.collectorSignIn,
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        _error!,
                        style: TextStyle(color: Colors.red.shade900),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  TextField(
                    controller: _email,
                    decoration: InputDecoration(
                      labelText: t.email,
                      border: const OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    decoration: InputDecoration(
                      labelText: t.password,
                      border: const OutlineInputBorder(),
                    ),
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                  ),
                  if (_showTwoFactor) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _twoFactor,
                      decoration: InputDecoration(
                        labelText: t.twoFactorCode,
                        border: const OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                    ),
                  ],
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _loading ? null : _signIn,
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: _loading
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Text(t.signIn),
                  ),
                  const SizedBox(height: 12),
                  const LanguageToggle(),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
