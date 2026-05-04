<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class TicketController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = Ticket::query()->with(['customer', 'assignedTo']);

        if (is_array($filters = $request->input('filter'))) {
            foreach (['status', 'type', 'priority', 'assigned_to_user_id', 'customer_id'] as $f) {
                if (! empty($filters[$f])) {
                    $query->where($f, $filters[$f]);
                }
            }
        }
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('number', 'ilike', "%{$search}%")
                    ->orWhere('title', 'ilike', "%{$search}%");
            });
        }

        $sort = (string) $request->query('sort', '-created_at');
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');
        $allowed = ['created_at', 'scheduled_at', 'priority', 'status'];
        $query->orderBy(in_array($column, $allowed, true) ? $column : 'created_at', $direction);

        return TicketResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function show(int $id): TicketResource
    {
        $ticket = Ticket::query()
            ->with(['customer', 'assignedTo'])
            ->findOrFail($id);

        return new TicketResource($ticket);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'customer_id' => ['required', 'uuid', 'exists:customers,id'],
            'type' => ['required', Rule::in(Ticket::TYPES)],
            'priority' => ['sometimes', Rule::in(Ticket::PRIORITIES)],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'scheduled_at' => ['nullable', 'date'],
            'assigned_to_user_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where(fn ($q) => $q->where('tenant_id', app(TenantContext::class)->id()))],
        ]);

        $tenantId = app(TenantContext::class)->id();
        $data['tenant_id'] = $tenantId;
        $data['number'] = $this->nextNumber($tenantId);
        $data['priority'] ??= 'normal';
        $data['status'] = $data['scheduled_at'] ?? null ? 'scheduled' : 'open';

        $ticket = Ticket::query()->create($data);

        return response()->json([
            'data' => new TicketResource($ticket->load(['customer', 'assignedTo'])),
        ], 201);
    }

    public function update(Request $request, int $id): TicketResource
    {
        $ticket = Ticket::query()->findOrFail($id);

        $data = $request->validate([
            'type' => ['sometimes', Rule::in(Ticket::TYPES)],
            'priority' => ['sometimes', Rule::in(Ticket::PRIORITIES)],
            'status' => ['sometimes', Rule::in(Ticket::STATUSES)],
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'scheduled_at' => ['sometimes', 'nullable', 'date'],
            'completed_at' => ['sometimes', 'nullable', 'date'],
            'assigned_to_user_id' => ['sometimes', 'nullable', 'integer', Rule::exists('users', 'id')->where(fn ($q) => $q->where('tenant_id', app(TenantContext::class)->id()))],
        ]);

        if (($data['status'] ?? null) === 'done' && empty($data['completed_at'])) {
            $data['completed_at'] = now();
        }

        $ticket->update($data);

        return new TicketResource($ticket->fresh()->load(['customer', 'assignedTo']));
    }

    public function destroy(int $id): JsonResponse
    {
        $ticket = Ticket::query()->findOrFail($id);
        $ticket->delete();

        return response()->json(null, 204);
    }

    private function nextNumber(string $tenantId): string
    {
        $year = now()->format('Y');
        $prefix = "TK-{$year}-";

        $last = Ticket::withoutGlobalScopes()
            ->where('tenant_id', $tenantId)
            ->where('number', 'like', "{$prefix}%")
            ->selectRaw('MAX(number) as max_num')
            ->value('max_num');

        $seq = $last
            ? ((int) substr($last, strlen($prefix))) + 1
            : 1;

        return $prefix.str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
