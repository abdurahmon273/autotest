<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'username',
        'chat_id',
        'max_attempts',
        'lang',
        'session_id',
        'password',
    ];

    protected $appends = ['phone_formatted', 'initials'];

    protected $hidden = [
        'password',
        'remember_token',
        'session_id',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class);
    }

    public function homeworks(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Homework::class);
    }

    public function results(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Result::class);
    }

    public function scopeWithRole(Builder $q, int $roleId): Builder
    {
        return $q->whereHas('roles', fn ($q) => $q->where('roles.id', $roleId));
    }

    public function scopeStaff(Builder $q): Builder
    {
        return $q->whereHas('roles', fn ($q) => $q->whereNotIn('roles.id', Role::NON_STAFF));
    }

    public function hasRole(int $roleId): bool
    {
        return $this->roles()->where('roles.id', $roleId)->exists();
    }

    public function getIsAdminAttribute(): bool
    {
        return $this->hasRole(Role::ADMIN);
    }

    public function getIsStudentAttribute(): bool
    {
        return $this->hasRole(Role::STUDENT);
    }

    public function getIsTeacherAttribute(): bool
    {
        return $this->hasRole(Role::TEACHER);
    }

    public function getIsStaffAttribute(): bool
    {
        return $this->roles()->whereNotIn('roles.id', Role::NON_STAFF)->exists();
    }

    public function getInitialsAttribute(): string
    {
        return mb_strtoupper(mb_substr($this->name, 0, 1));
    }

    public static function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }
        $digits = preg_replace('/\D/', '', $phone);

        return strlen($digits) === 12 && str_starts_with($digits, '998') ? substr($digits, 3) : $digits;
    }

    public function getPhoneFormattedAttribute(): ?string
    {
        if (! $this->phone || strlen($this->phone) !== 9) {
            return $this->phone;
        }

        return sprintf('(%s) %s-%s-%s', substr($this->phone, 0, 2), substr($this->phone, 2, 3), substr($this->phone, 5, 2), substr($this->phone, 7, 2));
    }

    public function flushPermissionCache(): void
    {
        Cache::forget('user_permissions_'.$this->id);
    }
}
