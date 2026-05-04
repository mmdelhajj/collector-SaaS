<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless(
            $request->user()?->can('settings.manage'),
            403,
            'You do not have permission to view audit logs.',
        );

        $perPage = (int) min(max((int) $request->integer('per_page', 50), 1), 200);

        $query = AuditLog::query()->with('user');

        if (is_array($filters = $request->input('filter'))) {
            if (! empty($filters['action'])) {
                $query->where('action', 'like', $filters['action'].'%');
            }
            if (! empty($filters['user_id'])) {
                $query->where('user_id', $filters['user_id']);
            }
            if (! empty($filters['subject_type'])) {
                $query->where('subject_type', $filters['subject_type']);
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'ilike', "%{$search}%")
                    ->orWhere('subject_label', 'ilike', "%{$search}%");
            });
        }

        $query->orderByDesc('created_at');

        $page = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => collect($page->items())->map(fn (AuditLog $a) => [
                'id' => $a->id,
                'action' => $a->action,
                'subject_type' => $a->subject_type ? class_basename($a->subject_type) : null,
                'subject_id' => $a->subject_id,
                'subject_label' => $a->subject_label,
                'changes' => $a->changes,
                'ip_address' => $a->ip_address,
                'created_at' => $a->created_at?->toIso8601String(),
                'user' => $a->user ? ['id' => $a->user->id, 'name' => $a->user->name] : null,
            ]),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
                'total' => $page->total(),
                'per_page' => $page->perPage(),
            ],
        ]);
    }
}
