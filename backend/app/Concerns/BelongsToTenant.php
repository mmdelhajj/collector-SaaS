<?php

declare(strict_types=1);

namespace App\Concerns;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

/**
 * Mixin for any model whose rows are scoped to a single tenant.
 *
 * Adds:
 *   - a global scope that rewrites every query with `WHERE tenant_id = :ctx`
 *   - automatic population of `tenant_id` on insert
 *   - the `tenant()` BelongsTo relationship
 *
 * Bypass guidance:
 *   - System / job code that legitimately needs cross-tenant access must
 *     call `Model::withoutTenant()` and assume responsibility for scoping.
 *   - Tests use `Model::withoutTenant()` for setup; the actual code paths
 *     under test must run with a TenantContext set.
 */
trait BelongsToTenant
{
    public static function bootBelongsToTenant(): void
    {
        static::addGlobalScope(new TenantScope);

        static::creating(function (Model $model): void {
            if (! empty($model->getAttribute('tenant_id'))) {
                return;
            }
            $ctx = app(TenantContext::class);
            if (! $ctx->isSet()) {
                throw new RuntimeException(
                    'Cannot create '.static::class.' without an active tenant context.'
                );
            }
            $model->setAttribute('tenant_id', $ctx->id());
        });
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Run a query with no tenant scope. Use sparingly — only system code
     * (queue jobs, super-admin tooling, tests) should ever bypass.
     */
    public static function withoutTenant(): Builder
    {
        return static::query()->withoutGlobalScope(TenantScope::class);
    }
}
