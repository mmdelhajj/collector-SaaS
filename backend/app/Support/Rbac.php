<?php

declare(strict_types=1);

namespace App\Support;

/**
 * Single source of truth for RBAC roles and permissions.
 * Mirrored in CLAUDE.md — change here if the spec changes.
 */
final class Rbac
{
    public const ROLE_TENANT_OWNER = 'tenant_owner';

    public const ROLE_TENANT_ADMIN = 'tenant_admin';

    public const ROLE_MANAGER = 'manager';

    public const ROLE_ACCOUNTANT = 'accountant';

    public const ROLE_SUPPORT = 'support';

    public const ROLE_TECHNICIAN = 'technician';

    public const ROLE_COLLECTOR = 'collector';

    public const ROLE_CUSTOMER = 'customer';

    public const ROLE_DESCRIPTIONS = [
        self::ROLE_TENANT_OWNER => 'Full control. Owners always have every permission — locked.',
        self::ROLE_TENANT_ADMIN => 'All admin powers except billing.',
        self::ROLE_MANAGER => 'Day-to-day operations: customers, packages, invoices, collectors.',
        self::ROLE_ACCOUNTANT => 'Finance: invoices, payments, refunds, reports — no customer edits.',
        self::ROLE_SUPPORT => 'View customers, take messages, see invoices/payments.',
        self::ROLE_TECHNICIAN => 'Field technician — installs and repairs (mobile-first).',
        self::ROLE_COLLECTOR => 'Door-to-door cash collection. Mobile + web /my-route.',
        self::ROLE_CUSTOMER => 'Self-service portal — locked to invoices.view + payments.view.',
    ];

    /**
     * @return list<string>
     */
    public static function roles(): array
    {
        return [
            self::ROLE_TENANT_OWNER,
            self::ROLE_TENANT_ADMIN,
            self::ROLE_MANAGER,
            self::ROLE_ACCOUNTANT,
            self::ROLE_SUPPORT,
            self::ROLE_TECHNICIAN,
            self::ROLE_COLLECTOR,
            self::ROLE_CUSTOMER,
        ];
    }

    /**
     * The full granular permission catalogue, grouped by feature area.
     *
     * @return list<string>
     */
    public static function permissions(): array
    {
        return [
            // Customers
            'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
            // Packages
            'packages.view', 'packages.manage',
            // Invoices
            'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.cancel', 'invoices.discount',
            // Payments
            'payments.view', 'payments.record', 'payments.refund',
            // Collectors
            'collectors.view', 'collectors.assign', 'collectors.reassign',
            // Reports
            'reports.view', 'reports.export',
            // Users + roles
            'users.manage', 'roles.manage',
            // RADIUS
            'radius.manage', 'nas.manage',
            // Workspace settings + billing
            'settings.manage', 'billing.manage',
        ];
    }

    /**
     * Permission-grid: which permissions does each role get?
     *
     * @return array<string, list<string>>
     */
    public static function rolePermissions(): array
    {
        $all = self::permissions();
        $allExceptBilling = array_values(array_diff($all, ['billing.manage']));

        return [
            self::ROLE_TENANT_OWNER => $all,
            self::ROLE_TENANT_ADMIN => $allExceptBilling,
            self::ROLE_MANAGER => [
                'customers.view', 'customers.create', 'customers.edit',
                'packages.view', 'packages.manage',
                'invoices.view', 'invoices.create', 'invoices.edit',
                'payments.view', 'payments.record',
                'collectors.view', 'collectors.assign', 'collectors.reassign',
                'reports.view', 'reports.export',
            ],
            self::ROLE_ACCOUNTANT => [
                'customers.view',
                'invoices.view', 'invoices.create', 'invoices.edit', 'invoices.cancel', 'invoices.discount',
                'payments.view', 'payments.record', 'payments.refund',
                'reports.view', 'reports.export',
            ],
            self::ROLE_SUPPORT => [
                'customers.view',
                'invoices.view',
                'payments.view',
            ],
            self::ROLE_TECHNICIAN => [
                'customers.view',
            ],
            self::ROLE_COLLECTOR => [
                'customers.view',
                'invoices.view',
                'payments.view', 'payments.record',
            ],
            self::ROLE_CUSTOMER => [
                'invoices.view',
                'payments.view',
            ],
        ];
    }
}
