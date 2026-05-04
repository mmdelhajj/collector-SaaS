<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CollectorZone;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CollectorZoneController extends Controller
{
    public function index(): JsonResponse
    {
        $zones = CollectorZone::query()
            ->with('defaultCollector')
            ->orderBy('name')
            ->get()
            ->map(fn ($z) => [
                'id' => $z->id,
                'name' => $z->name,
                'color' => $z->color,
                'polygon' => $z->polygon,
                'is_active' => $z->is_active,
                'default_collector' => $z->defaultCollector
                    ? ['id' => $z->defaultCollector->id, 'name' => $z->defaultCollector->name]
                    : null,
                'created_at' => $z->created_at?->toIso8601String(),
                'updated_at' => $z->updated_at?->toIso8601String(),
            ]);

        return response()->json(['data' => $zones]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensure();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'polygon' => ['required', 'array'],
            'polygon.*' => ['array', 'size:2'],
            'polygon.*.*' => ['numeric'],
            'default_collector_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where(fn ($q) => $q->where('tenant_id', app(TenantContext::class)->id()))],
        ]);

        $zone = CollectorZone::query()->create([
            ...$data,
            'tenant_id' => app(TenantContext::class)->id(),
            'color' => $data['color'] ?? '#0ea5e9',
            'is_active' => true,
        ]);

        return response()->json(['data' => $zone], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->ensure();
        $zone = CollectorZone::query()->findOrFail($id);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'polygon' => ['sometimes', 'array'],
            'polygon.*' => ['array', 'size:2'],
            'polygon.*.*' => ['numeric'],
            'default_collector_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')->where(fn ($q) => $q->where('tenant_id', app(TenantContext::class)->id()))],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $zone->update($data);

        return response()->json(['data' => $zone->fresh()]);
    }

    public function destroy(int $id): JsonResponse
    {
        $this->ensure();
        $zone = CollectorZone::query()->findOrFail($id);
        $zone->delete();

        return response()->json(null, 204);
    }

    private function ensure(): void
    {
        abort_unless(
            request()->user()?->can('settings.manage'),
            403,
            'You do not have permission to manage zones.',
        );
    }
}
