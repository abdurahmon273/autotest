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
            ['access_random_logic', Permission::TYPE_ADMIN],
            ['access_test', Permission::TYPE_ADMIN],
        ];

        foreach (['teacher', 'student', 'group', 'question', 'theme', 'staff', 'role', 'permission', 'task'] as $module) {
            foreach (['access', 'create', 'update', 'delete', 'show'] as $action) {
                $rows[] = ["{$action}_{$module}", Permission::TYPE_ADMIN];
            }
        }

        $created = 0;
        foreach ($rows as [$title, $type]) {
            $permission = Permission::firstOrNew(['title' => $title]);
            if (! $permission->exists) {
                $created++;
            }
            $permission->type = $type;
            $permission->save();
        }

        if ($admin = Role::find(Role::ADMIN)) {
            $admin->permissions()->syncWithoutDetaching(Permission::whereIn('type', [Permission::TYPE_ADMIN, Permission::TYPE_ALL])->pluck('id'));
            $admin->flushUsersPermissionCache();
        }

        $this->command?->info("Ruxsatlar: jami ".count($rows).", yangi yaratildi: {$created}, Admin roliga biriktirildi.");
    }
}
