<?php

namespace App\Services;

use App\Enums\QuizEnum;
use App\Enums\ResultStatusEnum;
use App\Models\Group;
use App\Models\Homework;
use App\Models\Result;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class HomeworkService
{
    /** Hozir yechish mumkin bo'lgan tasklar: status 1 va start <= now < end. */
    public static function activeTasks(): Builder
    {
        $now = now();

        return Task::query()
            ->where('tasks.status', Task::STATUS_ACCESSIBLE)
            ->where('tasks.start_date', '<=', $now)
            ->where('tasks.end_date', '>', $now);
    }

    /** Task yaratilganda guruhdagi barcha studentlarga bo'sh homework (progress) yaratish. */
    public function createForTask(Task $task): int
    {
        $ids = Group::findOrFail($task->group_id)->students()->pluck('users.id');

        return $this->createRows($task->id, $ids);
    }

    /** Guruhga student qo'shilganda faol tasklar uchun homework yaratish. */
    public function createForStudents(Group $group, iterable $userIds): void
    {
        $taskIds = Task::where('group_id', $group->id)->where('status', Task::STATUS_ACCESSIBLE)->where('end_date', '>', now())->pluck('id');
        foreach ($taskIds as $taskId) {
            $this->createRows($taskId, collect($userIds));
        }
    }

    private function createRows(int $taskId, Collection $userIds): int
    {
        if ($userIds->isEmpty()) {
            return 0;
        }
        $now = now();
        $rows = $userIds->map(fn ($uid) => [
            'task_id' => $taskId,
            'user_id' => $uid,
            'status' => Homework::STATUS_PROGRESS,
            'percentage' => 0,
            'tests_count' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all();

        // unique(task_id, user_id) — mavjudlari o'zgarmaydi.
        return Homework::insertOrIgnore($rows);
    }

    /** User uchun menyu ro'yxati: faol tasklar + shu userning homework holati. Bitta query. */
    public function listForUser(User $user, string $lang = 'krill'): Collection
    {
        $titleCol = $lang === 'krill' ? 'title_krill' : 'title';
        $other = $lang === 'krill' ? 'title' : 'title_krill';

        return static::activeTasks()
            ->join('homeworks', 'homeworks.task_id', '=', 'tasks.id')
            ->join('themes', 'themes.id', '=', 'tasks.theme_id')
            ->where('homeworks.user_id', $user->id)
            ->orderByDesc('tasks.id')
            ->get([
                'tasks.id as task_id', 'homeworks.id as homework_id', 'tasks.title', 'tasks.theme_id',
                'tasks.min_test_count', 'tasks.passing_percentage', 'tasks.end_date',
                'homeworks.status', 'homeworks.percentage', 'homeworks.tests_count',
                DB::raw("COALESCE(themes.{$titleCol}, themes.{$other}) as theme_title"),
            ]);
    }

    /** Shu result uchun "vazifa sifatida saqlash" mumkin bo'lgan homeworklar. */
    public function optionsForResult(Result $result): Collection
    {
        if ($result->type !== QuizEnum::TOPIC || ! $result->theme_id || $result->homework_id || $result->status !== ResultStatusEnum::FINISHED) {
            return collect();
        }

        return static::activeTasks()
            ->join('homeworks', 'homeworks.task_id', '=', 'tasks.id')
            ->where('homeworks.user_id', $result->user_id)
            ->where('tasks.theme_id', $result->theme_id)
            ->orderByDesc('tasks.id')
            ->get(['homeworks.id as homework_id', 'tasks.id as task_id', 'tasks.title', 'tasks.min_test_count', 'tasks.passing_percentage', 'homeworks.status', 'homeworks.percentage', 'homeworks.tests_count']);
    }

    /** Resultni homeworkga biriktirish va qayta hisoblash. */
    public function attach(Result $result, Homework $homework): Homework
    {
        abort_unless($homework->user_id === $result->user_id, 403);
        abort_if($result->homework_id, 422, 'Bu natija allaqachon vazifaga saqlangan.');
        abort_if($result->status !== ResultStatusEnum::FINISHED, 422, 'Test hali yakunlanmagan.');

        $task = static::activeTasks()->where('tasks.id', $homework->task_id)->first();
        abort_if(! $task, 422, 'Vazifa muddati tugagan.');
        abort_if($task->theme_id !== $result->theme_id, 422, 'Natija bu vazifaning mavzusiga tegishli emas.');

        return DB::transaction(function () use ($result, $homework) {
            $result->update(['homework_id' => $homework->id]);

            return $this->reGenerateHomework($homework->id);
        });
    }

    /**
     * Homeworkni bog'langan resultlar bo'yicha qayta hisoblash.
     * tests_count = jami to'g'ri + noto'g'ri javoblar, percentage = to'g'ri / jami.
     * status: 0 failed, 1 progress, 2 passed.
     */
    public function reGenerateHomework(int $homeworkId): Homework
    {
        $homework = Homework::with('task')->findOrFail($homeworkId);

        $sum = Result::where('homework_id', $homework->id)
            ->where('status', ResultStatusEnum::FINISHED)
            ->selectRaw('COALESCE(SUM(correct),0) as correct, COALESCE(SUM(in_correct),0) as in_correct')
            ->first();

        $correct = (int) $sum->correct;
        $total = $correct + (int) $sum->in_correct;
        $percentage = $total ? (int) round($correct * 100 / $total) : 0;

        $task = $homework->task;
        $status = Homework::STATUS_PROGRESS;
        if ($total >= $task->min_test_count) {
            $status = $percentage >= $task->passing_percentage ? Homework::STATUS_PASSED : Homework::STATUS_FAILED;
        }

        $homework->update(['tests_count' => $total, 'percentage' => $percentage, 'status' => $status]);

        return $homework;
    }

    /**
     * Vazifani yakunlash: muddati o'tgan va hali faol bo'lsa statusni expired qiladi
     * (atomik update — ikki job bir vaqtda ishlasa ham bitta yakunlaydi), keyin natijalarni Telegramga yuboradi.
     * Qaytaradi: true — shu chaqiruv yakunladi, false — allaqachon yakunlangan yoki muddati hali kelmagan.
     */
    public function finishGroupTask(Task $task): bool
    {
        $updated = Task::whereKey($task->id)
            ->where('status', Task::STATUS_ACCESSIBLE)
            ->where('end_date', '<=', now())
            ->update(['status' => Task::STATUS_EXPIRED, 'updated_at' => now()]);

        if (! $updated) {
            return false;
        }

        $task->refresh();
        $this->checkAllHomeworks($task);
        $this->sendGroupHomeworkResults($task);

        return true;
    }

    /**
     * Muddat tugagach barcha homeworklarni yakuniy holatga keltirish: 2 (passed) yoki 0 (failed).
     * Passed sharti: percentage >= passing_percentage VA tests_count >= min_test_count.
     * Fail bo'lganlarga jarima: userning imkoniyati (max_attempts) 1 ga kamayadi (0 dan pastga tushmaydi).
     */
    public function checkAllHomeworks(Task $task): array
    {
        // Faqat yakunlangan (expired) vazifa uchun. Faol vazifada holatlar va jarimalar o'zgarmaydi.
        if ((int) $task->status !== Task::STATUS_EXPIRED || $task->end_date->isFuture()) {
            return ['passed' => 0, 'failed' => 0, 'skipped' => true];
        }

        return DB::transaction(function () use ($task) {
            $passedQuery = fn () => Homework::where('task_id', $task->id)
                ->where('percentage', '>=', $task->passing_percentage)
                ->where('tests_count', '>=', $task->min_test_count);

            $failedIds = Homework::where('task_id', $task->id)
                ->whereNotIn('id', $passedQuery()->select('id'))
                ->pluck('user_id', 'id');

            // Jarima faqat hali "jarayonda" (1) bo'lib endi fail bo'layotganlarga — qayta chaqirilsa ikki marta ayrilmaydi.
            $penalize = Homework::whereIn('id', $failedIds->keys())->where('status', Homework::STATUS_PROGRESS)->pluck('user_id');

            $passed = $passedQuery()->update(['status' => Homework::STATUS_PASSED, 'updated_at' => now()]);
            $failed = Homework::whereIn('id', $failedIds->keys())->where('status', '!=', Homework::STATUS_FAILED)->update(['status' => Homework::STATUS_FAILED, 'updated_at' => now()]);

            if ($penalize->isNotEmpty()) {
                User::whereIn('id', $penalize)->where('max_attempts', '>', 0)->decrement('max_attempts');
            }

            return ['passed' => $passed, 'failed' => $failed, 'penalized' => $penalize->count()];
        });
    }

    /**
     * Task bo'yicha barcha studentlarning natijalarini guruhning Telegram chatiga yuborish.
     * Qaytaradi: yuborilgan xabarlar soni. Token/chat yo'q bo'lsa RuntimeException.
     */
    public function sendGroupHomeworkResults(Task $task, ?TelegramService $telegram = null): int
    {
        $telegram ??= app(TelegramService::class);
        $task->loadMissing(['group:id,name,telegram_chat_id', 'theme:id,title,title_krill']);

        $chatId = (string) $task->group?->telegram_chat_id;
        if ($chatId === '') {
            throw new \RuntimeException('Guruhga Telegram guruh ID kiritilmagan.');
        }

        // Yakunlangan vazifada "jarayonda" homework qolmasligi kerak (qo'lda expired qilingan holat uchun).
        if ((int) $task->status === Task::STATUS_EXPIRED && $task->homeworks()->where('status', Homework::STATUS_PROGRESS)->exists()) {
            $this->checkAllHomeworks($task);
        }

        $rows = $task->homeworks()
            ->with('user:id,name,username,max_attempts')
            ->withSum(['results as correct_sum' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)], 'correct')
            ->withSum(['results as in_correct_sum' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)], 'in_correct')
            ->orderByDesc('status')->orderByDesc('percentage')->orderBy('id')
            ->get();

        $e = TelegramService::escape(...);
        $finished = $task->status === Task::STATUS_EXPIRED;
        $counts = $rows->countBy('status');
        $theme = $task->theme?->title ?? $task->theme?->title_krill ?? '—';

        $header = implode("\n", [
            '<b>'.$e($finished ? '✅ Uyga vazifa yakunlandi' : '📊 Uyga vazifa natijalari (davom etmoqda)').'</b>',
            '',
            '<b>'.$e($task->title).'</b>',
            '👥 Guruh: '.$e($task->group->name),
            '📚 Bo‘lim: '.$e($theme),
            '🗓 '.$task->start_date->format('d.m.Y H:i').' — '.$task->end_date->format('d.m.Y H:i'),
            '🎯 Minimal test: '.$task->min_test_count.' ta · Minimal foiz: '.$task->passing_percentage.'%',
            '',
            '👤 Jami: '.$rows->count().' · ✅ Muvaffaqiyatli: '.($counts[Homework::STATUS_PASSED] ?? 0).' · ❌ Muvaffaqiyatsiz: '.($counts[Homework::STATUS_FAILED] ?? 0).' · ⏳ Tugallanmagan: '.($counts[Homework::STATUS_PROGRESS] ?? 0),
        ]);

        $chunks = [$header];
        foreach ($rows as $i => $h) {
            $name = $e($h->user?->name ?? '—');
            $username = $h->user?->username ? ' (@'.$e($h->user->username).')' : '';
            $status = match ((int) $h->status) {
                Homework::STATUS_PASSED => '✅ Muvaffaqiyatli',
                Homework::STATUS_FAILED => '❌ Muvaffaqiyatsiz',
                default => $finished ? '⏳ Tugallanmagan' : '🔄 Jarayonda',
            };
            $chunks[] = implode("\n", array_filter([
                '<b>'.($i + 1).'. '.$name.'</b>'.$username,
                ' - To‘g‘ri: '.(int) $h->correct_sum.' ta',
                ' - Xato: '.(int) $h->in_correct_sum.' ta',
                ' - Jami: '.$h->tests_count.' / '.$task->min_test_count,
                ' - Foiz: '.$h->percentage.'%',
                ' - Imkoniyat: '.(int) ($h->user?->max_attempts ?? 0),
                ' - Holat: '.$status,
                (int) $h->status === Homework::STATUS_FAILED ? ' - Jarima: mavjud' : null,
            ]));
        }
        if ($rows->isEmpty()) {
            $chunks[] = $e('Guruhda studentlar yo‘q.');
        }

        return $telegram->sendChunks($chatId, $chunks);
    }

    public function summary(Homework $homework): array
    {
        return $homework->only('id', 'task_id', 'status', 'percentage', 'tests_count');
    }
}
