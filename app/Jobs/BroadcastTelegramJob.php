<?php

namespace App\Jobs;

use App\Models\Role;
use App\Models\User;
use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

/** Barcha studentlarga (chat_id si borlarga) bitta xabar. Yuborilmaganlar jim o'tkaziladi. */
class BroadcastTelegramJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 1800;

    public function __construct(public string $text) {}

    public function handle(TelegramService $telegram): void
    {
        User::withRole(Role::STUDENT)
            ->whereNotNull('chat_id')
            ->select('id', 'chat_id')
            ->chunkById(200, function ($students) use ($telegram) {
                foreach ($students as $student) {
                    $telegram->trySend($student->chat_id, $this->text);
                    usleep(40000);
                }
            });
    }
}
