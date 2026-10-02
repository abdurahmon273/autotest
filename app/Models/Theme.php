<?php

namespace App\Models;

use App\Support\Lang;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class Theme extends Model
{
    use SoftDeletes;

    public const ICON_TEXT = 0;
    public const ICON_IMAGE = 1;

    public const ICON_TYPES = [
        self::ICON_TEXT => 'Emoji / matn',
        self::ICON_IMAGE => 'Rasm',
    ];

    protected $appends = ['icon_url'];

    public const STATUS_HIDDEN = 0;
    public const STATUS_ACTIVE = 1;

    protected $fillable = [
        'title',
        'title_krill',
        'icon_type',
        'icon',
        'status',
        'order_id',
    ];

    protected $casts = ['status' => 'integer'];

    /**
     * Global scope: status = 0 mavzular hech qayerda ko'rinmaydi (ro'yxat, menyu, random quiz, pivot).
     * Admin boshqaruvi uchun Theme::withInactive() ishlatiladi.
     */
    protected static function booted(): void
    {
        static::addGlobalScope('active', fn (Builder $q) => $q->where('themes.status', self::STATUS_ACTIVE));
    }

    public function scopeOrdered(Builder $q): Builder
    {
        return $q->orderBy('themes.order_id')->orderBy('themes.id');
    }

    public static function withInactive(): Builder
    {
        return static::withoutGlobalScope('active');
    }

    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class);
    }

    public function getIconUrlAttribute(): ?string
    {
        return $this->icon_type === self::ICON_IMAGE && $this->icon && Storage::disk('public')->exists($this->icon) ? Storage::url($this->icon) : null;
    }

    public static function titleColumn(?string $lang = null): string
    {
        $lang ??= Lang::default();
        $col = $lang === 'krill' ? 'title_krill' : 'title';
        $other = $lang === 'krill' ? 'title' : 'title_krill';

        return "COALESCE({$col}, {$other}) as title";
    }

    public function scopeTitled(Builder $q, ?string $lang = null): Builder
    {
        return $q->addSelect(DB::raw(self::titleColumn($lang)));
    }
}
