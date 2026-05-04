<?php

declare(strict_types=1);

namespace App\Concerns;

use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

final class TenantScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $ctx = app(TenantContext::class);
        if (! $ctx->isSet()) {
            // No context = no rows. Better to return empty than to leak.
            $builder->whereRaw('1 = 0');

            return;
        }
        $builder->where(
            $model->qualifyColumn('tenant_id'),
            $ctx->id(),
        );
    }
}
