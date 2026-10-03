<?php

namespace App\Jobs;

use App\Models\Task;
use App\Services\HomeworkService;
use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Vazifa yaratilganda darhol: studentlarga "sizga vazifa biriktirildi" xabari. */
class SentTaskCreateNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(public int $taskId) {}

    public function handle(HomeworkService $service, TelegramService $telegram): void
    {
        $task = Task::whereKey($this->taskId)
            ->where('status', Task::STATUS_ACCESSIBLE)
            ->where('end_date', '>', now())
            ->with('theme:id,title,title_krill')
            ->first();

        if (! $task) {
            return;
        }

        $theme = TelegramService::escape($task->theme?->title ?? $task->theme?->title_krill ?? $task->title);

        $text = "📘 Sizga uyga vazifa biriktirildi, iltimos uyga vazifalarni o‘z vaqtida yeching.\n\n"
            ."Vazifa: <b>{$theme}</b>\n"
            .'Sana (gacha): <b>'.HomeworkService::formatDate($task->end_date).'</b>';

        $service->notifyStudents($task, $text, $telegram);
    }
}
