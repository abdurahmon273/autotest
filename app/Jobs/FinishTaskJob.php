<?php

namespace App\Jobs;

use App\Models\Task;
use App\Services\HomeworkService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

/**
 * Vazifa tugash vaqtidan 10 soniya keyin ishlaydi.
 * Job bazadagi holatga ishonadi: end_date o'zgartirilgan bo'lsa eski job hech narsa qilmaydi,
 * yangi sana bilan dispatch qilingan job yakunlaydi.
 */
class FinishTaskJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $taskId) {}

    /** Vazifa saqlanganda/tahrirlanganda chaqiriladi. */
    public static function schedule(Task $task): void
    {
        if ($task->status !== Task::STATUS_ACCESSIBLE) {
            return;
        }
        $at = $task->end_date->copy()->addSeconds(10);
        static::dispatch($task->id)->delay($at->isFuture() ? $at : now());
    }

    public function backoff(): array
    {
        return [60, 300];
    }

    public function handle(HomeworkService $service): void
    {
        // Kam query: faqat hali faol va muddati o'tgan bo'lsa ishlaydi.
        $task = Task::whereKey($this->taskId)
            ->where('status', Task::STATUS_ACCESSIBLE)
            ->where('end_date', '<=', now())
            ->first();

        if (! $task) {
            return;
        }

        try {
            $service->finishGroupTask($task);
        } catch (\RuntimeException $e) {
            // Status allaqachon expired bo'ldi; Telegram xatosi (token/chat yo'q) qayta urinishga sabab bo'lmaydi.
            Log::warning("FinishTaskJob: task {$task->id} yakunlandi, lekin Telegramga yuborilmadi: {$e->getMessage()}");
        }
    }
}
