<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Plan;
use App\Models\Tenant;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlansController extends Controller
{
    public function index(): JsonResponse
    {
        $plans = Plan::query()->orderBy('sort_order')->orderBy('id')->get();

        // Count tenants per plan in a single grouped query so the page shows
        // "X tenants on this plan" without N+1.
        $counts = Tenant::query()
            ->selectRaw('plan, COUNT(*) AS n')
            ->groupBy('plan')
            ->pluck('n', 'plan');

        return response()->json([
            'data' => $plans->map(fn (Plan $p) => $this->serialize($p, (int) ($counts[$p->code] ?? 0))),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $plan = Plan::query()->findOrFail($id);
        $tenantsCount = Tenant::query()->where('plan', $plan->code)->count();

        return response()->json([
            'data' => $this->serialize($plan, $tenantsCount),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules(null));

        $plan = Plan::query()->create($this->normalize($data));

        Audit::record('platform.plan_created', $plan, $data, $plan->name);

        return response()->json([
            'data' => $this->serialize($plan, 0),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $plan = Plan::query()->findOrFail($id);
        $data = $request->validate($this->rules($plan->id));
        $oldCode = $plan->code;

        $plan->fill($this->normalize($data));
        $plan->save();

        // If the plan code changed, keep tenants in sync — they reference
        // the plan by code on tenants.plan, not by id.
        if (isset($data['code']) && $data['code'] !== $oldCode) {
            Tenant::query()->where('plan', $oldCode)->update(['plan' => $plan->code]);
        }

        Audit::record('platform.plan_updated', $plan, $data, $plan->name);

        $tenantsCount = Tenant::query()->where('plan', $plan->code)->count();

        return response()->json([
            'data' => $this->serialize($plan->fresh(), $tenantsCount),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $plan = Plan::query()->findOrFail($id);
        $tenantsCount = Tenant::query()->where('plan', $plan->code)->count();
        if ($tenantsCount > 0) {
            return response()->json([
                'message' => "Cannot delete — {$tenantsCount} tenant(s) are still on this plan. Move them to another plan first.",
            ], 422);
        }

        $name = $plan->name;
        $plan->delete();

        Audit::record('platform.plan_deleted', null, ['code' => $plan->code], $name);

        return response()->json(['message' => 'deleted']);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function rules(?int $ignoreId): array
    {
        $codeUnique = Rule::unique('plans', 'code');
        if ($ignoreId !== null) {
            $codeUnique = $codeUnique->ignore($ignoreId);
        }

        return [
            'code' => [$ignoreId === null ? 'required' : 'sometimes', 'string', 'max:32', 'regex:/^[a-z0-9_-]+$/', $codeUnique],
            'name' => [$ignoreId === null ? 'required' : 'sometimes', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:255'],
            'price_monthly' => [$ignoreId === null ? 'required' : 'sometimes', 'numeric', 'min:0', 'max:99999.99'],
            'price_annual' => ['nullable', 'numeric', 'min:0', 'max:9999999.99'],
            'limit_customers' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'limit_users' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'limit_collectors' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'feature_radius' => ['sometimes', 'boolean'],
            'feature_whatsapp' => ['sometimes', 'boolean'],
            'feature_sms' => ['sometimes', 'boolean'],
            'feature_priority_support' => ['sometimes', 'boolean'],
            'is_public' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:1000'],
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function normalize(array $data): array
    {
        // Casting is handled by the model, but coerce empty-string limits
        // to null so the form doesn't trip the integer validation when an
        // admin clears the field to mean "unlimited".
        foreach (['limit_customers', 'limit_users', 'limit_collectors', 'price_annual'] as $k) {
            if (array_key_exists($k, $data) && $data[$k] === '') {
                $data[$k] = null;
            }
        }

        return $data;
    }

    /**
     * @return array<string, mixed>
     */
    private function serialize(Plan $plan, int $tenantsCount): array
    {
        return [
            'id' => $plan->id,
            'code' => $plan->code,
            'name' => $plan->name,
            'description' => $plan->description,
            'price_monthly' => (float) $plan->price_monthly,
            'price_annual' => $plan->price_annual !== null ? (float) $plan->price_annual : null,
            'limit_customers' => $plan->limit_customers,
            'limit_users' => $plan->limit_users,
            'limit_collectors' => $plan->limit_collectors,
            'feature_radius' => (bool) $plan->feature_radius,
            'feature_whatsapp' => (bool) $plan->feature_whatsapp,
            'feature_sms' => (bool) $plan->feature_sms,
            'feature_priority_support' => (bool) $plan->feature_priority_support,
            'is_public' => (bool) $plan->is_public,
            'sort_order' => (int) $plan->sort_order,
            'tenants_count' => $tenantsCount,
            'created_at' => $plan->created_at?->toIso8601String(),
            'updated_at' => $plan->updated_at?->toIso8601String(),
        ];
    }
}
