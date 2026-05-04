<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Package\StorePackageRequest;
use App\Http\Requests\Package\UpdatePackageRequest;
use App\Http\Resources\PackageResource;
use App\Models\Package;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PackageController extends Controller
{
    private const ALLOWED_SORTS = [
        'created_at', 'updated_at', 'name', 'price', 'sort_order',
    ];

    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = Package::query()->withCount('subscriptions');

        if (is_array($filters = $request->input('filter'))) {
            if (isset($filters['is_active'])) {
                $query->where('is_active', filter_var(
                    $filters['is_active'],
                    FILTER_VALIDATE_BOOLEAN
                ));
            }
            if (! empty($filters['service_category_id'])) {
                $query->where('service_category_id', $filters['service_category_id']);
            }
            if (! empty($filters['billing_type'])) {
                $query->where('billing_type', $filters['billing_type']);
            }
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->where('name', 'ilike', $like)
                    ->orWhere('code', 'ilike', $like);
            });
        }

        $sort = $request->string('sort')->trim()->toString() ?: 'sort_order';
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $field = ltrim($sort, '-+');
        if (! in_array($field, self::ALLOWED_SORTS, true)) {
            $field = 'sort_order';
            $direction = 'asc';
        }
        $query->orderBy($field, $direction);

        return PackageResource::collection(
            $query->paginate($perPage)->withQueryString(),
        );
    }

    public function store(StorePackageRequest $request): JsonResponse
    {
        $package = Package::query()->create($request->validated());

        return (new PackageResource($package))
            ->response()
            ->setStatusCode(201);
    }

    public function show(int $id): PackageResource
    {
        $package = Package::query()->withCount('subscriptions')->findOrFail($id);

        return new PackageResource($package);
    }

    public function update(UpdatePackageRequest $request, int $id): PackageResource
    {
        $package = Package::query()->findOrFail($id);
        $package->update($request->validated());

        return new PackageResource($package->fresh()->loadCount('subscriptions'));
    }

    public function destroy(int $id): JsonResponse
    {
        $package = Package::query()->withCount('subscriptions')->findOrFail($id);

        if (($package->subscriptions_count ?? 0) > 0) {
            return response()->json([
                'message' => 'Cannot delete a package with active subscriptions.',
                'subscriptions_count' => $package->subscriptions_count,
            ], 409);
        }

        $package->delete();

        return response()->json(null, 204);
    }
}
