import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/login_screen.dart';
import '../features/assignments/assignments_screen.dart';
import '../features/cash_handover/handover_screen.dart';
import '../features/customers/customer_detail_screen.dart';
import '../features/payments/record_payment_screen.dart';
import 'auth_storage.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authStorageProvider);
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) async {
      final hasToken = (await auth.token()) != null;
      final atLogin = state.matchedLocation == '/login';
      if (!hasToken && !atLogin) return '/login';
      if (hasToken && atLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/', builder: (_, __) => const AssignmentsScreen()),
      GoRoute(
        path: '/customer/:customerId',
        builder: (_, state) => CustomerDetailScreen(
          customerId: state.pathParameters['customerId']!,
          preferredInvoiceId: state.uri.queryParameters['invoice'],
        ),
      ),
      GoRoute(
        path: '/handover',
        builder: (_, __) => const HandoverScreen(),
      ),
      GoRoute(
        path: '/record/:invoiceId/:customerId',
        builder: (_, state) => RecordPaymentScreen(
          invoiceId: state.pathParameters['invoiceId']!,
          customerId: state.pathParameters['customerId']!,
        ),
      ),
    ],
  );
});
