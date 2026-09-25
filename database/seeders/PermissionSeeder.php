<?php

namespace Database\Seeders;

use App\Models\Permission;
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

        foreach (['teacher', 'student', 'group', 'question', 'theme', 'staff', 'role', 'permission'] as $module) {
            foreach (['access', 'create', 'update', 'delete', 'show'] as $action) {
                $rows[] = ["{$action}_{$module}", Permission::TYPE_ADMIN];
            }
        }

        $permissions = [];
        foreach ($rows as $i => [$title, $type]) {
            $permissions[] = ['id' => $i + 1, 'title' => $title, 'type' => $type];
        }

        Permission::upsert($permissions, ['id'], ['title', 'type']);
    }
}
