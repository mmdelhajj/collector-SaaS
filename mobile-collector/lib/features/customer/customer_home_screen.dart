import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/auth_storage.dart';
import '../../core/config.dart';

/// End-customer welcome screen.
///
/// The Customer role exists in the backend but per-customer self-service
/// endpoints (read-only "my bills" + online pay) are still in design.
/// Until those are exposed, customers signing in here see a friendly
/// landing page that points them to the web portal at runcollect.com and
/// to their provider's contact channels.
class CustomerHomeScreen extends ConsumerStatefulWidget {
  const CustomerHomeScreen({super.key});

  @override
  ConsumerState<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends ConsumerState<CustomerHomeScreen> {
  String? _name;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final n = await ref.read(authStorageProvider).userName();
    if (!mounted) return;
    setState(() => _name = n);
  }

  Future<void> _openPortal() async {
    await launchUrl(
      Uri.parse(AppConfig.apiBaseUrl),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> _signOut() async {
    await ref.read(authStorageProvider).clear();
    if (!mounted) return;
    context.go('/login');
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
                  const Icon(Icons.account_circle_outlined, size: 64),
                  const SizedBox(height: 16),
                  Text(
                    _name == null
                        ? 'Welcome to RunCollect'
                        : 'Hello, $_name',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 8),
                    child: Text(
                      'Your bills, service status, and payment options '
                      'live in your customer portal. Open it to see '
                      'what\'s due, download receipts, or get in touch '
                      'with your service provider.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF4B5563),
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: _openPortal,
                    icon: const Icon(Icons.open_in_new),
                    label: const Text('Open my portal'),
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
