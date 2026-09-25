<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Permission extends Model
{
    use SoftDeletes;

    public const TYPE_ADMIN = 1;
    public const TYPE_TEACHER = 2;
    public const TYPE_STUDENT = 3;
    public const TYPE_ALL = 4;

    public const TYPE = [
        self::TYPE_ADMIN => 'Admin',
        self::TYPE_TEACHER => 'Teacher',
        self::TYPE_STUDENT => 'Student',
        self::TYPE_ALL => 'Hammasi',
    ];

    protected $fillable = [
        'title',
        'type',
    ];

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class);
    }
}
