<?php

namespace App\Jobs;

use App\Models\GlobalSetting;
use App\Models\Task;
use App\Services\HomeworkService;
use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/**
 * Vazifa tugashidan N soat oldin (sozlama: task_notification_time) studentlarga eslatma.
 * Vazifa muddati N soatdan qisqa bo'lsa rejalashtirilmaydi. Job bazadagi holatga ishonadi.
 */
class SentTaskNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(public int $taskId) {}

    public static function schedule(Task $task): void
    {
        $hours = GlobalSetting::taskNotificationHours();

        if ($task->status !== Task::STATUS_ACCESSIBLE || $task->end_date->isPast()) {
            return;
        }
        if ($task->start_date->diffInHours($task->end_date) <= $hours) {
            return;
        }

        $at = $task->end_date->copy()->subHours($hours);
        static::dispatch($task->id)->delay($at->isFuture() ? $at : now());
    }

    public function handle(HomeworkService $service, TelegramService $telegram): void
    {
        $hours = GlobalSetting::taskNotificationHours();

        $task = Task::whereKey($this->taskId)
            ->where('status', Task::STATUS_ACCESSIBLE)
            ->where('end_date', '>', now())
            ->where('end_date', '<=', now()->addHours($hours))
            ->with('theme:id,title,title_krill')
            ->first();

        if (! $task) {
            return;
        }

        $left = now()->diff($task->end_date);
        $leftText = ($left->days * 24 + $left->h).' soat '.$left->i.' minut';
        $theme = TelegramService::escape($task->theme?->title ?? $task->theme?->title_krill ?? $task->title);

        $text = "⏰ Sizga biriktirilgan uyga vazifa tugashiga <b>{$leftText}</b> qoldi, iltimos uyga vazifani o‘z vaqtida yuklang.\n\n"
            ."Vazifa: <b>{$theme}</b>";

        $service->notifyStudents($task, $text, $telegram);
    }
}
