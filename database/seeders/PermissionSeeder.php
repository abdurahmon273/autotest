<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['access_dashboard', Permission::TYPE_ADMIN],
            ['access_profile', Permission::TYPE_ALL],
            ['update_profile', Permission::TYPE_ALL],
            ['access_settings', Permission::TYPE_ADMIN],
            ['access_telegram_setting', Permission::TYPE_ADMIN],
            ['access_general_setting', Permission::TYPE_ADMIN],
            ['access_test', Permission::TYPE_ADMIN],
        ];

        foreach (['teacher', 'student', 'group', 'question', 'theme', 'staff', 'role', 'permission', 'task'] as $module) {
            foreach (['access', 'create', 'update', 'delete', 'show'] as $action) {
                $rows[] = ["{$action}_{$module}", Permission::TYPE_ADMIN];
            }
        }

        $permissions = [];
        foreach ($rows as $i => [$title, $type]) {
            $permissions[] = ['id' => $i + 1, 'title' => $title, 'type' => $type];
        }

        Permission::upsert($permissions, ['id'], ['title', 'type']);

        // Admin roliga yangi qo'shilgan admin-turidagi ruxsatlarni biriktirish (mavjudlari saqlanadi).
        if ($admin = Role::find(Role::ADMIN)) {
            $admin->permissions()->syncWithoutDetaching(Permission::whereIn('type', [Permission::TYPE_ADMIN, Permission::TYPE_ALL])->pluck('id'));
            $admin->flushUsersPermissionCache();
        }
    }
}
