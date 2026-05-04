<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\MessageTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MessageTemplateController extends Controller
{
    private const TEMPLATE_KEYS = [
        'payment_received',
        'invoice_created',
        'invoice_reminder',
        'invoice_overdue',
        'service_suspended',
        'service_reactivated',
        'collector_assigned',
    ];

    public function index(Request $request): JsonResponse
    {
        $this->ensure('settings.manage');

        $q = MessageTemplate::query()->orderBy('key')->orderBy('channel')->orderBy('locale');
        if ($key = $request->query('key')) {
            $q->where('key', $key);
        }

        return response()->json(['data' => $q->get()]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->ensure('settings.manage');
        $template = MessageTemplate::query()->findOrFail($id);

        $data = $request->validate([
            'subject' => ['sometimes', 'nullable', 'string', 'max:200'],
            'body' => ['sometimes', 'string', 'max:4000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template->update($data);

        return response()->json(['data' => $template->fresh()]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensure('settings.manage');

        $data = $request->validate([
            'key' => ['required', Rule::in(self::TEMPLATE_KEYS)],
            'channel' => ['required', Rule::in(MessageTemplate::CHANNELS)],
            'locale' => ['required', Rule::in(['en', 'ar', 'fr'])],
            'subject' => ['nullable', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:4000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $template = MessageTemplate::query()->create($data + ['is_active' => true]);

        return response()->json(['data' => $template], 201);
    }

    private function ensure(string $permission): void
    {
        abort_unless(
            request()->user()?->can($permission),
            403,
            'You do not have permission to manage templates.',
        );
    }
}
