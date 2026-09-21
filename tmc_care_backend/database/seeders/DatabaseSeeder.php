<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // --- Departments ---
        foreach (['CCJE', 'CCS', 'COAD', 'COED', 'POLSCI'] as $name) {
            Department::create(['name' => $name]);
        }

        // --- Roles ---
        $roles = [
            ['name' => 'Super Administrator', 'description' => 'Full system access including settings, roles, and audit logs.', 'permissions' => ['View Dashboard', 'Manage Reports', 'Manage Requests', 'Manage Users', 'Manage Verifications', 'Send Communications', 'Manage System Settings', 'View Audit Logs']],
            ['name' => 'Case Officer', 'description' => 'Reviews and processes incident reports and financial requests.', 'permissions' => ['View Dashboard', 'Manage Reports', 'Manage Requests', 'Manage Verifications']],
            ['name' => 'Finance Reviewer', 'description' => 'Verifies documents and releases approved financial assistance.', 'permissions' => ['View Dashboard', 'Manage Verifications', 'Manage Requests (Financial)']],
            ['name' => 'Front Desk / Encoder', 'description' => 'Encodes new reports and requests submitted in person.', 'permissions' => ['View Dashboard', 'Create Reports', 'Create Requests']],
            ['name' => 'Student', 'description' => 'Can submit incident reports and financial assistance requests.', 'permissions' => ['Submit Report', 'Submit Request', 'Track Own Requests']],
        ];
        foreach ($roles as $r) {
            Role::create($r);
        }

        // --- First admin account (so you can log in) ---
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@tmc.edu.ph',
            'password' => Hash::make('password'),
            'role_id' => Role::where('name', 'Super Administrator')->value('id'),
            'department_id' => null,
            'status' => 'Active',
            'last_active_at' => now(),
        ]);
    }
}
