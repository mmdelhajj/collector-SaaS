<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\MessageLogResource;
use App\Models\MessageLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MessageLogController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = (int) min(max((int) $request->integer('per_page', 25), 1), 100);

        $query = MessageLog::query()->with('customer');

        if (is_array($filters = $request->input('filter'))) {
            foreach (['channel', 'status', 'template_key'] as $f) {
                if (! empty($filters[$f])) {
                    $query->where($f, $filters[$f]);
                }
            }
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $search).'%';
            $query->where(function ($q) use ($like) {
                $q->where('to_address', 'ilike', $like)
                    ->orWhereHas('customer', function ($c) use ($like) {
                        $c->where('first_name', 'ilike', $like)
                            ->orWhere('last_name', 'ilike', $like)
                            ->orWhere('code', 'ilike', $like);
                    });
            });
        }

        $query->orderByDesc('created_at');

        return MessageLogResource::collection(
            $query->paginate($perPage)->withQueryString(),
        );
    }
}
