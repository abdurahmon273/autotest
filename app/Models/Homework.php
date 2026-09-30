<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Homework extends Model
{
    protected $table = 'homeworks';

    public const STATUS_FAILED = 0;
    public const STATUS_PROGRESS = 1;
    public const STATUS_PASSED = 2;

    public const STATUSES = [
        self::STATUS_FAILED => 'Bajarilmadi',
        self::STATUS_PROGRESS => 'Jarayonda',
        self::STATUS_PASSED => 'Bajarildi',
    ];

    protected $fillable = [
        'task_id',
        'user_id',
        'status',
        'percentage',
        'tests_count',
    ];

    protected function casts(): array
    {
        return [
            'status' => 'integer',
            'percentage' => 'integer',
            'tests_count' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function results(): HasMany
    {
        return $this->hasMany(Result::class);
    }
}
