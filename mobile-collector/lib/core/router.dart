import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/admin/admin_customer_search_screen.dart';
import '../features/admin/admin_dashboard_screen.dart';
import '../features/admin/admin_live_map_screen.dart';
import '../features/assignments/assignments_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/cash_handover/handover_screen.dart';
import '../features/customer/customer_home_screen.dart';
import '../features/customers/customer_detail_screen.dart';
import '../features/payments/record_payment_screen.dart';
import '../features/role_home_redirect.dart';
import '../features/technician/technician_ticket_detail_screen.dart';
import '../features/technician/technician_tickets_screen.dart';
import '../features/web_launcher/web_launcher_screen.dart';
import 'auth_storage.dart';

/// Route map (by role):
///   /login         — auth screen (everyone, when signed out)
///   /              — role-aware redirect — bounces to one of:
///     /c           — collector home (today's assignments)
///     /m           — customer home (end-user portal launcher)
///     /jobs        — technician tickets list
///     /admin       — owner/admin/manager dashboard
///     /web         — accountant/support open-in-browser launcher
///
/// Collector-specific subroutes preserved from the single-role app:
///   /customer/:id            — collector's view of a customer
///   /handover                — end-of-day cash handover
///   /record/:invoiceId/:cid  — record-payment flow
///
/// Admin/Manager subroutes:
///   /admin/live    — live collector map
///   /admin/search  — customer search
///
/// Technician subroutes:
///   /jobs/:id      — ticket detail
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

      // Role-aware redirect — first stop after login.
      GoRoute(path: '/', builder: (_, __) => const RoleHomeRedirect()),

      // Collector flow (preserved).
      GoRoute(path: '/c', builder: (_, __) => const AssignmentsScreen()),
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

      // Customer (end-user) home.
      GoRoute(path: '/m', builder: (_, __) => const CustomerHomeScreen()),

      // Admin / Manager / Owner.
      GoRoute(
        path: '/admin',
        builder: (_, __) => const AdminDashboardScreen(),
      ),
      GoRoute(
        path: '/admin/live',
        builder: (_, __) => const AdminLiveMapScreen(),
      ),
      GoRoute(
        path: '/admin/search',
        builder: (_, __) => const AdminCustomerSearchScreen(),
      ),

      // Technician.
      GoRoute(
        path: '/jobs',
        builder: (_, __) => const TechnicianTicketsScreen(),
      ),
      GoRoute(
        path: '/jobs/:id',
        builder: (_, state) => TechnicianTicketDetailScreen(
          id: state.pathParameters['id']!,
        ),
      ),

      // Accountant / Support fallback — opens runcollect.com in browser.
      GoRoute(path: '/web', builder: (_, __) => const WebLauncherScreen()),
    ],
  );
});
