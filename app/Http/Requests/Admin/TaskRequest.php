<?php

namespace App\Http\Requests\Admin;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Task|null $task */
        $task = $this->route('task');
        $startChanged = ! $task || $task->start_date?->format('Y-m-d H:i') !== $this->input('start_date');

        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'theme_id' => ['required', 'integer', Rule::exists('themes', 'id')->whereNull('deleted_at')],
            'group_id' => [$task ? 'sometimes' : 'required', 'integer', Rule::exists('groups', 'id')->whereNull('deleted_at')],
            'min_test_count' => ['required', 'integer', 'min:1', 'max:1000'],
            'passing_percentage' => ['required', 'integer', 'min:1', 'max:100'],
            'start_date' => array_filter(['required', 'date_format:Y-m-d H:i', $startChanged ? 'after_or_equal:'.now()->startOfDay()->format('Y-m-d H:i') : null]),
            'end_date' => ['required', 'date_format:Y-m-d H:i', 'after:start_date'],
            'status' => [$task ? 'required' : 'sometimes', Rule::in([Task::STATUS_ACCESSIBLE, Task::STATUS_EXPIRED])],
        ];
    }

    public function attributes(): array
    {
        return [
            'title' => 'vazifa nomi',
            'description' => 'tavsif',
            'theme_id' => 'bo‘lim',
            'group_id' => 'guruh',
            'min_test_count' => 'minimal testlar soni',
            'passing_percentage' => 'minimal o‘tish foizi',
            'start_date' => 'boshlanish vaqti',
            'end_date' => 'tugash vaqti',
            'status' => 'holat',
        ];
    }

    public function messages(): array
    {
        return [
            'start_date.after_or_equal' => 'Boshlanish kuni bugun yoki bugundan keyin bo‘lishi kerak.',
            'end_date.after' => 'Tugash vaqti boshlanish vaqtidan keyin bo‘lishi kerak.',
            'start_date.date_format' => 'Boshlanish vaqti noto‘g‘ri formatda.',
            'end_date.date_format' => 'Tugash vaqti noto‘g‘ri formatda.',
        ];
    }
}
