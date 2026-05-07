<?php

use App\Http\Controllers\Api\Radius\RadiusGatewayController;
use App\Http\Controllers\Api\SuperAdmin\PlanChangeRequestsController;
use App\Http\Controllers\Api\SuperAdmin\PlansController;
use App\Http\Controllers\Api\SuperAdmin\PlatformController;
use App\Http\Controllers\Api\SuperAdmin\PlatformSettingsController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\CashHandoverController;
use App\Http\Controllers\Api\V1\CollectorAssignmentController;
use App\Http\Controllers\Api\V1\CollectorController;
use App\Http\Controllers\Api\V1\CollectorLiveController;
use App\Http\Controllers\Api\V1\CollectorPeriodController;
use App\Http\Controllers\Api\V1\CollectorZoneController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\ForgotPasswordController;
use App\Http\Controllers\Api\V1\InvoiceController;
use App\Http\Controllers\Api\V1\MessageLogController;
use App\Http\Controllers\Api\V1\MessageTemplateController;
use App\Http\Controllers\Api\V1\PackageController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\RadiusUserController;
use App\Http\Controllers\Api\V1\ReportsController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\SignupController;
use App\Http\Controllers\Api\V1\TicketController;
use App\Http\Controllers\Api\V1\TwoFactorController;
use App\Http\Controllers\Api\V1\UserController;
use Illuminate\Support\Facades\Route;

// ─── PUBLIC RADIUS GATEWAY ──────────────────────────────────────────────
// Called BY FreeRADIUS via rlm_rest. Gated by IP allowlist + shared secret.
// Rate-limited high (1000/min/IP) per CLAUDE.md spec — RADIUS is chatty.
Route::prefix('radius')->middleware(['radius.gateway', 'throttle:1000,1'])->name('radius.')->group(function () {
    Route::post('authorize', [RadiusGatewayController::class, 'authorize'])->name('authorize');
    Route::post('accounting', [RadiusGatewayController::class, 'accounting'])->name('accounting');
    Route::post('post-auth', [RadiusGatewayController::class, 'postAuth'])->name('post-auth');
});

// Tenant API: 60 req/min/IP per CLAUDE.md API DESIGN PRINCIPLES.
// Authenticated routes don't need a higher tier — a real admin/collector at
// 60/min has plenty of headroom; a compromised token can't scrape the DB.
// The dedicated login throttle inside AuthController is layered on top.
Route::prefix('v1')->middleware('throttle:60,1')->name('api.v1.')->group(function () {
    // Public auth endpoints (rate-limited inside the controller).
    Route::post('auth/login', [AuthController::class, 'login'])->name('auth.login');

    // Public password-reset flow. Both endpoints are unauthenticated and
    // rely on the route-group throttle plus per-email rate limiting inside
    // the controller. Always return generic responses to prevent email
    // enumeration.
    Route::post(
        'auth/forgot-password',
        [ForgotPasswordController::class, 'sendLink']
    )->name('auth.forgot-password');
    Route::post(
        'auth/reset-password',
        [ForgotPasswordController::class, 'reset']
    )->name('auth.reset-password');

    // Public self-service signup — no auth required.
    Route::get('plans', [SignupController::class, 'plans'])->name('plans.index');
    Route::post('signup', [SignupController::class, 'signup'])->name('signup');

    // ─── Super-admin (platform-wide, no tenant scope) ──────────────────
    Route::middleware(['auth:sanctum', 'super-admin'])
        ->prefix('super-admin')
        ->name('super-admin.')
        ->group(function () {
            Route::get('overview', [PlatformController::class, 'overview'])->name('overview');
            Route::get('tenants', [PlatformController::class, 'tenants'])->name('tenants');
            Route::post('tenants', [PlatformController::class, 'createTenant'])->name('tenants.create');
            Route::get('tenants/{id}', [PlatformController::class, 'tenantDetail'])->name('tenants.show');
            Route::patch('tenants/{id}', [PlatformController::class, 'updateTenant'])->name('tenants.update');
            Route::post('tenants/{id}/suspend', [PlatformController::class, 'suspend'])->name('tenants.suspend');
            Route::post('tenants/{id}/reactivate', [PlatformController::class, 'reactivate'])->name('tenants.reactivate');

            // Platform-level settings.
            Route::get('settings', [PlatformSettingsController::class, 'index'])->name('settings');
            Route::patch('settings/smtp', [PlatformSettingsController::class, 'updateSmtp'])->name('settings.smtp');
            Route::patch('settings/branding', [PlatformSettingsController::class, 'updateBranding'])->name('settings.branding');
            Route::patch('settings/defaults', [PlatformSettingsController::class, 'updateDefaults'])->name('settings.defaults');
            Route::post('settings/smtp/test', [PlatformSettingsController::class, 'testSmtp'])->name('settings.smtp.test');

            // Subscription plans (price tiers tenants pay).
            Route::get('plans', [PlansController::class, 'index'])->name('plans');
            Route::post('plans', [PlansController::class, 'store'])->name('plans.create');
            Route::get('plans/{id}', [PlansController::class, 'show'])->name('plans.show');
            Route::patch('plans/{id}', [PlansController::class, 'update'])->name('plans.update');
            Route::delete('plans/{id}', [PlansController::class, 'destroy'])->name('plans.delete');

            // Plan-change approval queue (tenant submits via /v1/billing/change-plan).
            Route::get(
                'plan-change-requests',
                [PlanChangeRequestsController::class, 'index']
            )->name('plan-change-requests');
            Route::post(
                'plan-change-requests/{id}/approve',
                [PlanChangeRequestsController::class, 'approve']
            )->name('plan-change-requests.approve');
            Route::post(
                'plan-change-requests/{id}/reject',
                [PlanChangeRequestsController::class, 'reject']
            )->name('plan-change-requests.reject');
        });

    // Authenticated routes — Bearer token via Sanctum.
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me', [AuthController::class, 'me'])->name('auth.me');
        Route::patch('auth/me', [AuthController::class, 'updateProfile'])->name('auth.profile');
        Route::post('auth/logout', [AuthController::class, 'logout'])->name('auth.logout');

        // Profile avatar self-service. Bytes are streamed via GET so the
        // frontend can proxy them to the browser as a same-origin URL.
        Route::get('auth/avatar', [AuthController::class, 'showAvatar'])->name('auth.avatar.show');
        Route::post('auth/avatar', [AuthController::class, 'uploadAvatar'])->name('auth.avatar.upload');
        Route::delete('auth/avatar', [AuthController::class, 'deleteAvatar'])->name('auth.avatar.delete');

        // Two-factor (TOTP) self-service.
        Route::get('auth/2fa', [TwoFactorController::class, 'status'])->name('auth.2fa');
        Route::post('auth/2fa/enroll', [TwoFactorController::class, 'enroll'])->name('auth.2fa.enroll');
        Route::post('auth/2fa/confirm', [TwoFactorController::class, 'confirm'])->name('auth.2fa.confirm');
        Route::post('auth/2fa/disable', [TwoFactorController::class, 'disable'])->name('auth.2fa.disable');

        // Tenant-scoped resources.
        Route::middleware('tenant')->group(function () {
            Route::apiResource('customers', CustomerController::class)
                ->parameters(['customers' => 'id']);
            Route::get('customers/{id}/outstanding', [CustomerController::class, 'outstanding'])
                ->name('customers.outstanding');
            Route::apiResource('packages', PackageController::class);

            Route::post('invoices/generate-bulk', [InvoiceController::class, 'generateBulk'])
                ->name('invoices.generate-bulk');
            Route::get('invoices/{id}/pdf', [InvoiceController::class, 'pdf'])
                ->name('invoices.pdf');
            Route::get('invoices/{id}/public-link', [InvoiceController::class, 'publicLink'])
                ->name('invoices.public-link');
            Route::apiResource('invoices', InvoiceController::class)
                ->parameters(['invoices' => 'id'])
                ->only(['index', 'store', 'show', 'destroy']);

            Route::post('payments/{id}/refund', [PaymentController::class, 'refund'])
                ->name('payments.refund');
            Route::apiResource('payments', PaymentController::class)
                ->parameters(['payments' => 'id'])
                ->only(['index', 'store', 'show']);

            Route::apiResource('users', UserController::class)
                ->parameters(['users' => 'id']);
            Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword'])
                ->name('users.reset-password');
            Route::post('users/{id}/transfer-and-delete', [UserController::class, 'transferAndDelete'])
                ->name('users.transfer-and-delete');

            // Role permission editor.
            Route::get('roles', [RoleController::class, 'index'])->name('roles.index');
            Route::patch('roles/{name}/permissions', [RoleController::class, 'update'])
                ->name('roles.permissions.update');

            Route::get('messages', [MessageLogController::class, 'index'])
                ->name('messages.index');

            // Collector assignments (manager view).
            Route::post('collector-assignments/bulk-assign', [CollectorAssignmentController::class, 'bulkAssign'])
                ->name('collector-assignments.bulk-assign');
            Route::apiResource('collector-assignments', CollectorAssignmentController::class)
                ->parameters(['collector-assignments' => 'id'])
                ->only(['index', 'show', 'update', 'destroy']);

            // Self-service for the authenticated collector.
            Route::get('collector/my-assignments', [CollectorController::class, 'myAssignments'])
                ->name('collector.my-assignments');
            Route::get('collector/my-stats', [CollectorController::class, 'myStats'])
                ->name('collector.my-stats');
            Route::get('collector/my-payments', [CollectorController::class, 'myPayments'])
                ->name('collector.my-payments');
            Route::post('collector/check-in', [CollectorController::class, 'checkIn'])
                ->name('collector.check-in');
            Route::post('collector/check-out', [CollectorController::class, 'checkOut'])
                ->name('collector.check-out');
            Route::get('collector/pending-cash', [CollectorController::class, 'pendingCash'])
                ->name('collector.pending-cash');
            Route::post('collector/handover-cash', [CollectorController::class, 'handover'])
                ->name('collector.handover');
            Route::post('collector/ping', [CollectorController::class, 'ping'])
                ->name('collector.ping');

            // Live collector locations (manager view).
            Route::get('collector-live', [CollectorLiveController::class, 'index'])
                ->name('collector-live.index');

            // Per-collector drill-down (today / yesterday / week / month / year).
            Route::get('collectors/{userId}/period', [CollectorPeriodController::class, 'show'])
                ->whereNumber('userId')
                ->name('collectors.period');

            // Cash handovers (supervisor view).
            Route::get('cash-handovers', [CashHandoverController::class, 'index'])
                ->name('cash-handovers.index');
            Route::get('cash-handovers/{id}', [CashHandoverController::class, 'show'])
                ->name('cash-handovers.show');
            Route::post('cash-handovers/{id}/confirm', [CashHandoverController::class, 'confirm'])
                ->name('cash-handovers.confirm');
            Route::post('cash-handovers/{id}/dispute', [CashHandoverController::class, 'dispute'])
                ->name('cash-handovers.dispute');
            Route::post('cash-handovers/{id}/resolve', [CashHandoverController::class, 'resolve'])
                ->name('cash-handovers.resolve');

            // Reports.
            Route::get('reports/dashboard', [ReportsController::class, 'dashboard'])->name('reports.dashboard');
            Route::get('reports/aging', [ReportsController::class, 'aging'])->name('reports.aging');
            Route::get('reports/collector-performance', [ReportsController::class, 'collectorPerformance'])->name('reports.collector-performance');
            Route::get('reports/revenue', [ReportsController::class, 'revenue'])->name('reports.revenue');
            Route::get('reports/export', [ReportsController::class, 'export'])->name('reports.export');

            // Tickets (installations, repairs, support).
            Route::apiResource('tickets', TicketController::class)->parameters(['tickets' => 'id']);

            // Message templates.
            Route::get('message-templates', [MessageTemplateController::class, 'index'])->name('message-templates.index');
            Route::post('message-templates', [MessageTemplateController::class, 'store'])->name('message-templates.store');
            Route::patch('message-templates/{id}', [MessageTemplateController::class, 'update'])->name('message-templates.update');

            // Workspace + integrations settings.
            Route::get('settings/workspace', [SettingsController::class, 'workspace'])->name('settings.workspace');
            Route::patch('settings/workspace', [SettingsController::class, 'updateWorkspace'])->name('settings.workspace.update');
            Route::get('settings/integrations', [SettingsController::class, 'integrations'])->name('settings.integrations');
            Route::patch('settings/integrations', [SettingsController::class, 'updateIntegrations'])->name('settings.integrations.update');
            Route::get('settings/notifications', [SettingsController::class, 'notifications'])->name('settings.notifications');
            Route::patch('settings/notifications', [SettingsController::class, 'updateNotifications'])->name('settings.notifications.update');
            Route::get('settings/payments', [SettingsController::class, 'payments'])->name('settings.payments');
            Route::patch('settings/payments', [SettingsController::class, 'updatePayments'])->name('settings.payments.update');
            Route::get('settings/currency', [SettingsController::class, 'currency'])->name('settings.currency');
            Route::patch('settings/currency', [SettingsController::class, 'updateCurrency'])->name('settings.currency.update');
            Route::post('settings/currency/refresh', [SettingsController::class, 'refreshExchangeRate'])->name('settings.currency.refresh');

            // Subscription/billing — tenant view of their plan + usage.
            Route::get('billing/subscription', [BillingController::class, 'subscription'])->name('billing.subscription');
            Route::get('billing/available-plans', [BillingController::class, 'availablePlans'])->name('billing.available-plans');
            Route::post('billing/change-plan', [BillingController::class, 'changePlan'])->name('billing.change-plan');
            Route::get('billing/pending-plan-request', [BillingController::class, 'pendingPlanRequest'])->name('billing.pending-plan-request');
            Route::post('billing/cancel-plan-request/{id}', [BillingController::class, 'cancelPlanRequest'])->name('billing.cancel-plan-request');

            Route::get('audit-logs', [AuditLogController::class, 'index'])->name('audit-logs.index');

            // Collector zones (geojson polygons).
            Route::apiResource('collector-zones', CollectorZoneController::class)->parameters(['collector-zones' => 'id'])->only(['index', 'store', 'update', 'destroy']);

            // RADIUS user management (admin).
            Route::get('radius-users', [RadiusUserController::class, 'index'])->name('radius-users.index');
            Route::get('radius-users/{id}', [RadiusUserController::class, 'show'])->name('radius-users.show');
            Route::get('radius-users/{id}/sessions', [RadiusUserController::class, 'sessions'])->name('radius-users.sessions');
            Route::post('radius-users/{id}/suspend', [RadiusUserController::class, 'suspend'])->name('radius-users.suspend');
            Route::post('radius-users/{id}/reactivate', [RadiusUserController::class, 'reactivate'])->name('radius-users.reactivate');
            Route::post('radius-users/{id}/change-speed', [RadiusUserController::class, 'changeSpeed'])->name('radius-users.change-speed');
        });
    });
});
