<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\ResultStatusEnum;
use App\Http\Requests\Admin\TaskRequest;
use App\Jobs\FinishTaskJob;
use App\Models\Group;
use App\Models\Homework;
use App\Models\Task;
use App\Models\Theme;
use App\Services\HomeworkService;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TaskController extends ApiController
{
    /** Uyga vazifalar bo'limi: barcha guruhlar (cardlar). */
    public function groups()
    {
        $this->can('access_task');

        return Group::withCount(['students', 'tasks'])
            ->latest('id')
            ->get(['id', 'name', 'description', 'telegram_chat_id', 'created_at']);
    }

    /** Guruh ma'lumotlari (studentlarsiz). */
    public function group(Group $group)
    {
        $this->can('access_task');

        $group->loadCount(['students', 'tasks']);

        return $group->only('id', 'name', 'description', 'telegram_chat_id', 'students_count', 'tasks_count', 'created_at');
    }

    /** Guruhga bog'langan vazifalar, 10 tadan (infinite scroll). */
    public function index(Request $request)
    {
        $this->can('access_task');

        return Task::query()
            ->where('group_id', $request->integer('group_id'))
            ->with('theme:id,title,title_krill')
            ->withCount('homeworks')
            ->latest('id')
            ->paginate(10);
    }

    public function store(TaskRequest $request)
    {
        $this->can('create_task');

        $task = DB::transaction(function () use ($request) {
            $task = Task::create($request->validated() + ['status' => Task::STATUS_ACCESSIBLE]);
            app(HomeworkService::class)->createForTask($task);

            return $task;
        });
        FinishTaskJob::schedule($task);

        return $this->ok('Saqlandi.', ['id' => $task->id]);
    }

    public function show(Task $task)
    {
        $this->can('show_task');

        $task->load(['theme' => fn ($q) => $q->select('id', 'title', 'title_krill', 'icon_type', 'icon')->withCount('questions'), 'group:id,name'])->loadCount('homeworks');

        $byStatus = $task->homeworks()->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');

        return $task->toArray() + [
            'passed_count' => (int) ($byStatus[Homework::STATUS_PASSED] ?? 0),
            'failed_count' => (int) ($byStatus[Homework::STATUS_FAILED] ?? 0),
            'progress_count' => (int) ($byStatus[Homework::STATUS_PROGRESS] ?? 0),
        ];
    }

    /** Task bo'yicha barcha studentlarning homeworklari. */
    public function homeworks(Request $request, Task $task)
    {
        $this->can('show_task');

        return $task->homeworks()
            ->with('user:id,name,phone,username')
            ->withSum(['results as correct_sum' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)], 'correct')
            ->withSum(['results as in_correct_sum' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)], 'in_correct')
            ->when($request->filled('status'), fn ($q) => $q->where('homeworks.status', (int) $request->status))
            ->when($request->search, fn ($q, $s) => $q->whereHas('user', fn ($u) => $u
                ->where('name', 'like', "%{$s}%")
                ->orWhere('username', 'like', "%{$s}%")
                ->orWhere('phone', 'like', "%{$s}%")))
            ->orderByDesc('status')->orderByDesc('percentage')->orderBy('id')
            ->paginate(10);
    }

    public function update(TaskRequest $request, Task $task)
    {
        $this->can('update_task');

        $task->update($request->safe()->except('group_id'));
        if ($task->wasChanged('end_date') || $task->wasChanged('status')) {
            FinishTaskJob::schedule($task->refresh());
        }
        // Admin qo'lda "Tugallangan" qilsa — homeworklar darhol 0/2 ga keltiriladi, jarimalar yoziladi.
        if ($task->wasChanged('status') && (int) $task->status === Task::STATUS_EXPIRED && $task->end_date->lte(now())) {
            app(HomeworkService::class)->checkAllHomeworks($task);
        }

        return $this->ok('Saqlandi.');
    }

    /** Natijalarni Telegram guruhga yuborish. Muddati o'tgan bo'lsa vazifa yakunlanadi ham. */
    public function telegram(Task $task, HomeworkService $service)
    {
        $this->can('show_task');

        try {
            if ($task->status === Task::STATUS_ACCESSIBLE && $task->end_date->lte(now())) {
                $service->finishGroupTask($task);

                return $this->ok('Vazifa yakunlandi va natijalar Telegramga yuborildi.', ['status' => Task::STATUS_EXPIRED]);
            }

            $service->sendGroupHomeworkResults($task);

            return $this->ok($task->status === Task::STATUS_ACCESSIBLE ? 'Natijalar Telegramga yuborildi. Vazifa hali davom etmoqda.' : 'Natijalar Telegramga yuborildi.', ['status' => $task->status]);
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(Task $task)
    {
        $this->can('delete_task');
        $task->delete();

        return $this->ok('O‘chirildi.');
    }

    /** Vazifa natijalari PDF. */
    public function pdf(Task $task)
    {
        $this->can('show_task');

        $task->load(['group:id,name', 'theme:id,title,title_krill']);
        $rows = $task->homeworks()
            ->with('user:id,name,username')
            ->withSum(['results as correct_sum' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)], 'correct')
            ->withSum(['results as in_correct_sum' => fn ($q) => $q->where('status', ResultStatusEnum::FINISHED)], 'in_correct')
            ->orderByDesc('status')->orderByDesc('percentage')->orderBy('id')
            ->get();

        $pdf = Pdf::loadView('admin.pdf.task', [
            'task' => $task,
            'rows' => $rows,
            'counts' => $rows->countBy('status'),
            'themeTitle' => $task->theme?->title ?? $task->theme?->title_krill ?? '—',
        ])->setPaper('a4');

        $name = Str::slug($task->title, '-') ?: 'vazifa';

        return $pdf->download("{$name}-natijalar.pdf");
    }

    /** Bitta bo'lim tanlash uchun qidiruv. */
    public function themes(Request $request)
    {
        $this->can('access_task');

        return Theme::query()
            ->select('id', 'title', 'title_krill', 'icon_type', 'icon')
            ->withCount('questions')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q->where('title', 'like', "%{$s}%")->orWhere('title_krill', 'like', "%{$s}%")))
            ->orderBy('title')
            ->limit(10)
            ->get();
    }
}
