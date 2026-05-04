<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

/**
 * Lightweight audit logger. Use directly from controllers/services:
 *
 *   Audit::record('payment.created', $payment, label: $payment->reference_number);
 *   Audit::record('user.role_changed', $user, ['old' => 'manager', 'new' => 'collector']);
 */
final class Audit
{
    /**
     * @param  array<string, mixed>|null  $changes
     */
    public static function record(
        string $action,
        ?Model $subject = null,
        ?array $changes = null,
        ?string $label = null,
    ): void {
        AuditLog::query()->create([
            'tenant_id' => app(TenantContext::class)->id(),
            'user_id' => Auth::id(),
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey() !== null ? (string) $subject->getKey() : null,
            'subject_label' => $label,
            'changes' => $changes,
            'ip_address' => Request::ip(),
            'user_agent' => substr((string) Request::userAgent(), 0, 500),
            'created_at' => now(),
        ]);
    }
}
