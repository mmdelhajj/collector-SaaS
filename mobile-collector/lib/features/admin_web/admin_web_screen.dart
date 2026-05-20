import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../core/auth_storage.dart';
import '../../core/config.dart';

/// Embedded admin WebView for office roles.
///
/// Loads the responsive web admin at `runcollect.com` via the
/// `/api/auth/from-mobile` bridge endpoint, which exchanges the mobile
/// Sanctum bearer token for a session cookie and redirects into the
/// dashboard. From that point the WebView is a fully signed-in admin
/// session — every feature the user can reach in their phone's browser
/// works the same here, plus the chrome (URL bar, browser UI) is hidden.
///
/// Hardware back button steps backwards through the WebView's history
/// before exiting (matches user expectation from native browsers).
class AdminWebScreen extends ConsumerStatefulWidget {
  /// Path inside the admin to open initially. Defaults to `/dashboard`
  /// (the manager landing). Use `/customers`, `/invoices`, etc. when
  /// deep-linking from elsewhere in the native shell.
  final String initialPath;

  const AdminWebScreen({super.key, this.initialPath = '/dashboard'});

  @override
  ConsumerState<AdminWebScreen> createState() => _AdminWebScreenState();
}

class _AdminWebScreenState extends ConsumerState<AdminWebScreen> {
  WebViewController? _controller;
  bool _loading = true;
  bool _initFailed = false;
  String? _errorDetail;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final token = await ref.read(authStorageProvider).token();
    if (token == null) {
      if (mounted) context.go('/login');
      return;
    }

    final bridge = Uri.parse(
      '${AppConfig.apiBaseUrl}/api/auth/from-mobile',
    ).replace(
      queryParameters: {'token': token, 'next': widget.initialPath},
    );

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFFFFFFFF))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (_) {
            if (mounted) setState(() => _loading = false);
          },
          onHttpError: (HttpResponseError err) {
            // Bridge returned 401/500 → kick back to login. Anything else
            // is a transient page-level error we just let the user see.
            final status = err.response?.statusCode ?? 0;
            if (status == 401 || status == 403) {
              if (mounted) {
                setState(() {
                  _initFailed = true;
                  _errorDetail =
                      'Session expired or rejected (HTTP $status).';
                });
              }
            }
          },
          onWebResourceError: (err) {
            // Only treat top-level load failures as fatal — sub-resource
            // errors (an image, a tracker) shouldn't surface a full
            // error screen.
            if (err.isForMainFrame == true) {
              if (mounted) {
                setState(() {
                  _initFailed = true;
                  _errorDetail = err.description;
                });
              }
            }
          },
        ),
      )
      ..loadRequest(bridge);

    if (!mounted) return;
    setState(() => _controller = controller);
  }

  Future<bool> _onBack() async {
    final c = _controller;
    if (c == null) return true;
    if (await c.canGoBack()) {
      await c.goBack();
      return false;
    }
    return true;
  }

  Future<void> _signOut() async {
    await ref.read(authStorageProvider).clear();
    if (!mounted) return;
    context.go('/login');
  }

  Future<void> _reload() async {
    setState(() {
      _initFailed = false;
      _errorDetail = null;
    });
    final c = _controller;
    if (c != null) {
      await c.reload();
    } else {
      _bootstrap();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final shouldPop = await _onBack();
        if (shouldPop && mounted) {
          // Nothing back-history-wise to pop — sign out instead of
          // silently exiting the whole app, so users don't get stuck
          // logged in.
          await _signOut();
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: _initFailed
              ? _ErrorView(
                  message: _errorDetail ?? 'Could not load admin.',
                  onRetry: _reload,
                  onSignOut: _signOut,
                )
              : Stack(
                  children: [
                    if (_controller != null)
                      WebViewWidget(controller: _controller!),
                    if (_loading)
                      const LinearProgressIndicator(minHeight: 2),
                  ],
                ),
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  final VoidCallback onSignOut;
  const _ErrorView({
    required this.message,
    required this.onRetry,
    required this.onSignOut,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off, size: 48, color: Colors.redAccent),
            const SizedBox(height: 12),
            const Text(
              'Could not reach the admin.',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF6B7280),
              ),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try again'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: onSignOut,
              icon: const Icon(Icons.logout),
              label: const Text('Sign out'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
