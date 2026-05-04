<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CollectorRoute;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollectorLiveController extends Controller
{
    /**
     * Live last-known locations of all checked-in collectors today.
     * Polled by the manager's live-map page every ~10 seconds.
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('collectors.view') || $request->user()?->can('collectors.assign'),
            403,
        );

        $routes = CollectorRoute::query()
            ->with('collector')
            ->whereDate('date', now()->toDateString())
            ->whereNotNull('last_latitude')
            ->whereNotNull('last_longitude')
            ->get();

        return response()->json([
            'data' => $routes->map(fn (CollectorRoute $r) => [
                'collector' => [
                    'id' => $r->collector?->id,
                    'name' => $r->collector?->name ?? 'Unknown',
                ],
                'latitude' => (float) $r->last_latitude,
                'longitude' => (float) $r->last_longitude,
                'last_ping_at' => $r->last_ping_at?->toIso8601String(),
                'started_at' => $r->started_at?->toIso8601String(),
                'ended_at' => $r->ended_at?->toIso8601String(),
                'is_active' => $r->ended_at === null,
                'total_collected' => (float) $r->total_collected,
            ]),
        ]);
    }
}
