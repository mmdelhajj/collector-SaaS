import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth_storage.dart';
import '../../core/config.dart';

/// Landing page for office roles whose features live on the web admin
/// (accountant, support, and any unknown role we'd rather not silently
/// drop into the collector flow).
///
/// Shows the user's name + role and a single "Open admin in browser"
/// button that launches `runcollect.com` in the device browser. The web
/// admin is now mobile-responsive so this is a complete experience.
class WebLauncherScreen extends ConsumerStatefulWidget {
  const WebLauncherScreen({super.key});

  @override
  ConsumerState<WebLauncherScreen> createState() => _WebLauncherScreenState();
}

class _WebLauncherScreenState extends ConsumerState<WebLauncherScreen> {
  String? _name;
  AppRole _role = AppRole.unknown;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final auth = ref.read(authStorageProvider);
    final n = await auth.userName();
    final r = await auth.primaryRole();
    if (!mounted) return;
    setState(() {
      _name = n;
      _role = r;
    });
  }

  Future<void> _openWeb() async {
    final uri = Uri.parse(AppConfig.apiBaseUrl);
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  Future<void> _signOut() async {
    await ref.read(authStorageProvider).clear();
    if (!mounted) return;
    context.go('/login');
  }

  String _roleLabel(AppRole role) {
    switch (role) {
      case AppRole.tenantOwner:
        return 'Owner';
      case AppRole.tenantAdmin:
        return 'Admin';
      case AppRole.manager:
        return 'Manager';
      case AppRole.accountant:
        return 'Accountant';
      case AppRole.support:
        return 'Support';
      case AppRole.technician:
        return 'Technician';
      case AppRole.collector:
        return 'Collector';
      case AppRole.customer:
        return 'Customer';
      case AppRole.unknown:
        return 'Team member';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(Icons.work_outline, size: 56),
                  const SizedBox(height: 16),
                  Text(
                    _name == null ? 'Welcome' : 'Welcome, $_name',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'You\'re signed in as ${_roleLabel(_role)}.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                      'Your day-to-day tools live on the web admin — '
                      'it works great in your phone\'s browser. Tap '
                      'below to open it.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF4B5563),
                        height: 1.4,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: _openWeb,
                    icon: const Icon(Icons.open_in_new),
                    label: const Text('Open admin in browser'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _signOut,
                    icon: const Icon(Icons.logout),
                    label: const Text('Sign out'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size.fromHeight(48),
                    ),
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
