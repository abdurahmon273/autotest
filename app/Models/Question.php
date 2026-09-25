<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Question extends Model
{
    use SoftDeletes;

    public const TYPE_TEXT = 0;
    public const TYPE_IMAGE = 1;

    public const TYPES = [
        self::TYPE_TEXT => 'Rasmsiz',
        self::TYPE_IMAGE => 'Rasmli',
    ];

    protected $appends = ['image_url'];

    protected $fillable = [
        'type',
        'question_krill',
        'question_latin',
        'image',
        'instruction_krill',
        'instruction_latin',
    ];

    public function answers(): HasMany
    {
        return $this->hasMany(Answer::class)->orderBy('order');
    }

    public function themes(): BelongsToMany
    {
        return $this->belongsToMany(Theme::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        return $this->image ? Storage::url($this->image) : null;
    }
}
