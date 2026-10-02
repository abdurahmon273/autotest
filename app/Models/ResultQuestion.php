<?php

namespace App\Models;

use App\Enums\ResultQuestionStatusEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResultQuestion extends Model
{
    protected $fillable = [
        'result_id',
        'question_id',
        'user_id',
        'correct_answer_id',
        'user_answer_id',
        'status',
        'is_last',
        'order',
        'time',
        'timing_status',
    ];

    protected function casts(): array
    {
        return ['status' => ResultQuestionStatusEnum::class];
    }

    public function result(): BelongsTo
    {
        return $this->belongsTo(Result::class);
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
