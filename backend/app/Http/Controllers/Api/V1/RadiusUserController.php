<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\RadiusUserResource;
use App\Models\RadiusUser;
use App\Services\Radius\CoaService;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class RadiusUserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('radius.manage'), 403);

        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = RadiusUser::query()->with('customer');

        if (is_array($filters = $request->input('filter'))) {
            foreach (['status', 'radius_group', 'customer_id'] as $f) {
                if (! empty($filters[$f])) {
                    $query->where($f, $filters[$f]);
                }
            }
        }
        if ($search = $request->string('search')->trim()->toString()) {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->where('username', 'ilike', $like)
                    ->orWhereHas('customer', function ($c) use ($like) {
                        $c->where('first_name', 'ilike', $like)
                            ->orWhere('last_name', 'ilike', $like)
                            ->orWhere('code', 'ilike', $like);
                    });
            });
        }

        $query->orderByDesc('last_seen_at')->orderByDesc('created_at');

        return RadiusUserResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function show(int $id, Request $request): RadiusUserResource
    {
        abort_unless($request->user()?->can('radius.manage'), 403);

        $user = RadiusUser::query()->with('customer')->findOrFail($id);

        return new RadiusUserResource($user);
    }

    public function suspend(int $id, Request $request, CoaService $coa): RadiusUserResource
    {
        if (! $request->user()->can('radius.manage')) {
            abort(403);
        }
        $user = RadiusUser::query()->findOrFail($id);
        $user->update(['status' => 'suspended']);
        $coa->suspend($user);

        Audit::record('radius.suspended', $user, null, $user->username);

        return new RadiusUserResource($user->fresh()->load('customer'));
    }

    public function reactivate(int $id, Request $request, CoaService $coa): RadiusUserResource
    {
        if (! $request->user()->can('radius.manage')) {
            abort(403);
        }
        $user = RadiusUser::query()->findOrFail($id);
        $user->update(['status' => 'active']);
        // Force a reauth so the NAS picks up the new policy.
        $coa->disconnect($user);

        Audit::record('radius.reactivated', $user, null, $user->username);

        return new RadiusUserResource($user->fresh()->load('customer'));
    }

    public function changeSpeed(int $id, Request $request, CoaService $coa): RadiusUserResource
    {
        if (! $request->user()->can('radius.manage')) {
            abort(403);
        }
        $request->validate([
            'radius_group' => ['required', 'string', 'max:64'],
        ]);
        $user = RadiusUser::query()->findOrFail($id);
        $oldGroup = $user->radius_group;
        $newGroup = $request->input('radius_group');
        $user->update(['radius_group' => $newGroup]);
        $coa->changeRadiusGroup($user, $newGroup);

        Audit::record(
            'radius.speed_changed',
            $user,
            ['old' => $oldGroup, 'new' => $newGroup],
            $user->username,
        );

        return new RadiusUserResource($user->fresh()->load('customer'));
    }

    public function sessions(int $id, Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('radius.manage'), 403);

        $user = RadiusUser::query()->findOrFail($id);
        $sessions = $user->sessions()
            ->orderByDesc('started_at')
            ->limit(50)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'session_id' => $s->session_id,
                'nas_ip' => $s->nas_ip,
                'framed_ip' => $s->framed_ip,
                'started_at' => $s->started_at?->toIso8601String(),
                'ended_at' => $s->ended_at?->toIso8601String(),
                'duration_seconds' => $s->duration_seconds,
                'bytes_in' => $s->bytes_in,
                'bytes_out' => $s->bytes_out,
                'terminate_cause' => $s->terminate_cause,
            ]);

        return response()->json(['data' => $sessions]);
    }
}
