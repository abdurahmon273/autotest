<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    public const STATUS_ACCESSIBLE = 1;
    public const STATUS_EXPIRED = 0;

    public const STATUSES = [
        self::STATUS_ACCESSIBLE => 'Faol',
        self::STATUS_EXPIRED => 'Tugallangan',
    ];

    protected $fillable = [
        'title',
        'description',
        'start_date',
        'end_date',
        'passing_percentage',
        'min_test_count',
        'status',
        'group_id',
        'theme_id',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'datetime:Y-m-d H:i',
            'end_date' => 'datetime:Y-m-d H:i',
            'status' => 'integer',
            'passing_percentage' => 'integer',
            'min_test_count' => 'integer',
        ];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function theme(): BelongsTo
    {
        return $this->belongsTo(Theme::class);
    }

    public function homeworks(): HasMany
    {
        return $this->hasMany(Homework::class);
    }
}
