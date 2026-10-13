<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Departments, the staff roles and one login for each.
 * Safe to run on an existing database (it never duplicates anything and never
 * resets a password that was already changed):
 *
 *     php artisan db:seed --class=StaffAccountsSeeder
 */
class StaffAccountsSeeder extends Seeder
{
    /** The five departments of TMC. */
    public const DEPARTMENTS = ['CCS', 'CCJE', 'COAD', 'CAS', 'COED'];

    public function run(): void
    {
        $this->seedDepartments();

        $guidance = Role::updateOrCreate(
            ['name' => 'Guidance Counselor'],
            [
                'description' => 'Reviews incident reports, views the photos and files sent by students and staff, assigns cases and updates their status.',
                'permissions' => ['View Dashboard', 'Manage Incident Reports', 'Manage Verifications'],
            ]
        );

        // The overall TMC Treasurer.
        $treasurer = Role::updateOrCreate(
            ['name' => 'Treasurer'],
            [
                'description' => 'TMC Treasurer: reviews financial assistance requests, opens donation drives, receives the cash handed over by department treasurers and releases the assistance.',
                'permissions' => ['View Dashboard', 'Manage Financial Requests', 'Manage Verifications'],
            ]
        );

        // One per department (CCS, CCJE, COAD, CAS, COED).
        $deptTreasurer = Role::updateOrCreate(
            ['name' => 'Department Treasurer'],
            [
                'description' => 'Collects donations from his/her own department and hands them over to the TMC Treasurer.',
                'permissions' => ['View Dashboard', 'Collect Donations'],
            ]
        );

        User::firstOrCreate(
            ['email' => 'guidance@tmc.edu.ph'],
            [
                'name' => 'Guidance Counselor',
                'password' => Hash::make('password'),
                'role_id' => $guidance->id,
                'department_id' => null,
                'status' => 'Active',
                'last_active_at' => now(),
                'avatar_color' => '#7C3AED',
            ]
        );

        User::firstOrCreate(
            ['email' => 'treasurer@tmc.edu.ph'],
            [
                'name' => 'TMC Treasurer',
                'password' => Hash::make('password'),
                'role_id' => $treasurer->id,
                'department_id' => null,
                'status' => 'Active',
                'last_active_at' => now(),
                'avatar_color' => '#0F766E',
            ]
        );

        $colors = ['#2F6FED', '#EA580C', '#16A34A', '#7C3AED', '#0F766E'];
        foreach (self::DEPARTMENTS as $i => $name) {
            User::firstOrCreate(
                ['email' => 'treasurer.' . strtolower($name) . '@tmc.edu.ph'],
                [
                    'name' => "{$name} Treasurer",
                    'password' => Hash::make('password'),
                    'role_id' => $deptTreasurer->id,
                    'department_id' => Department::where('name', $name)->value('id'),
                    'status' => 'Active',
                    'last_active_at' => now(),
                    'avatar_color' => $colors[$i % count($colors)],
                ]
            );
        }
    }

    private function seedDepartments(): void
    {
        // The old seed had POLSCI instead of CAS: rename it so nobody linked to it is lost.
        if (! Department::where('name', 'CAS')->exists() && ($old = Department::where('name', 'POLSCI')->first())) {
            $old->update(['name' => 'CAS']);
        }

        foreach (self::DEPARTMENTS as $name) {
            Department::firstOrCreate(['name' => $name]);
        }
    }
}
