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

    protected $fillable = [
        'title',
        'title_krill',
        'icon_type',
        'icon',
    ];

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
