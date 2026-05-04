import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/api_client.dart';
import '../../core/auth_storage.dart';

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
      await auth.save(
        token: data['token'] as String,
        userId: user['id'] as int,
        userName: user['name'] as String,
      );
      if (!mounted) return;
      context.go('/');
    } catch (e) {
      final msg = _extractError(e);
      setState(() {
        if (msg == 'two_factor_required') {
          _showTwoFactor = true;
          _error = 'Enter your authenticator code.';
        } else {
          _error = msg ?? 'Login failed';
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
                  const Icon(Icons.account_balance_wallet, size: 64),
                  const SizedBox(height: 16),
                  Text(
                    'Collector sign-in',
                    style: Theme.of(context).textTheme.headlineSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  if (_error != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
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
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    decoration: const InputDecoration(
                      labelText: 'Password',
                      border: OutlineInputBorder(),
                    ),
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                  ),
                  if (_showTwoFactor) ...[
                    const SizedBox(height: 12),
                    TextField(
                      controller: _twoFactor,
                      decoration: const InputDecoration(
                        labelText: '6-digit code',
                        border: OutlineInputBorder(),
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
                        : const Text('Sign in'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
