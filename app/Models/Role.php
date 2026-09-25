<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Role extends Model
{
    use SoftDeletes;

    public const ADMIN = 1;
    public const TEACHER = 2;
    public const STUDENT = 3;

    public const SYSTEM = [self::ADMIN, self::TEACHER, self::STUDENT];
    public const NON_STAFF = [self::TEACHER, self::STUDENT];

    protected $fillable = [
        'title',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }

    public function scopeStaff(Builder $q): Builder
    {
        return $q->whereNotIn('id', self::NON_STAFF)->orderBy('id');
    }

    public function flushUsersPermissionCache(): void
    {
        $this->users()->pluck('users.id')->each(
            fn ($id) => Cache::forget('user_permissions_'.$id)
        );
    }
}
