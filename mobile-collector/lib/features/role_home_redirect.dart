import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/auth_storage.dart';

/// Lands at `/` and bounces the user to the right home screen for their
/// role. Used both as the login-success destination and as the warm-start
/// landing after the auth redirect lets us through.
class RoleHomeRedirect extends ConsumerStatefulWidget {
  const RoleHomeRedirect({super.key});

  @override
  ConsumerState<RoleHomeRedirect> createState() => _RoleHomeRedirectState();
}

class _RoleHomeRedirectState extends ConsumerState<RoleHomeRedirect> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _route());
  }

  Future<void> _route() async {
    final auth = ref.read(authStorageProvider);
    final role = await auth.primaryRole();
    if (!mounted) return;

    switch (role) {
      case AppRole.collector:
        context.go('/c');
        return;
      case AppRole.customer:
        context.go('/m');
        return;
      case AppRole.technician:
        context.go('/jobs');
        return;
      case AppRole.tenantOwner:
      case AppRole.tenantAdmin:
      case AppRole.manager:
        context.go('/admin');
        return;
      case AppRole.accountant:
      case AppRole.support:
        context.go('/web');
        return;
      case AppRole.unknown:
        // No role info — most likely a legacy install that signed in
        // before we started persisting roles. Fall back to collector
        // (which is what every install used to land on) and let the
        // user log out + back in if they're actually a different role.
        context.go('/c');
        return;
    }
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
