<?php

namespace App\Models;

use App\Enums\QuizEnum;
use App\Enums\ResultStatusEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Result extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'type',
        'theme_id',
        'status',
        'correct',
        'in_correct',
        'all_questions',
        'is_passed',
    ];

    protected function casts(): array
    {
        return [
            'type' => QuizEnum::class,
            'status' => ResultStatusEnum::class,
            'is_passed' => 'boolean',
        ];
    }

    public function questions(): HasMany
    {
        return $this->hasMany(ResultQuestion::class)->orderBy('order');
    }

    public function theme(): BelongsTo
    {
        return $this->belongsTo(Theme::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
