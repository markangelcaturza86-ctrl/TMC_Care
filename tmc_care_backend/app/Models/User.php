<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role_id',
        'department_id',
        'status',
        'last_active_at',
        'avatar_color',
        'preferences',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_active_at' => 'datetime',
            'preferences' => 'array',
        ];
    }

    /** Settings page defaults (notification toggles + dark mode). */
    public const DEFAULT_PREFERENCES = [
        'email' => true,
        'newRequests' => true,
        'verifications' => true,
        'digest' => false,
        'darkMode' => false,
    ];

    /** Saved preferences merged over the defaults. */
    public function settings(): array
    {
        return array_merge(self::DEFAULT_PREFERENCES, $this->getAttribute('preferences') ?? []);
    }

    public function wants(string $key): bool
    {
        return (bool) ($this->settings()[$key] ?? false);
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    // ---------------------------------------------------------------------
    // Role based access (Guidance Counselor, Treasurer, Super Administrator…)
    // ---------------------------------------------------------------------

    public function isSuperAdmin(): bool
    {
        $this->loadMissing('role');

        return $this->role?->name === 'Super Administrator';
    }

    /** True when the Super Administrator, or the role holds ANY of the given permissions. */
    public function hasAnyPermission(array $permissions): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $this->loadMissing('role');

        return count(array_intersect($permissions, $this->role?->permissions ?? [])) > 0;
    }

    /** A treasurer for one department (CCS, CCJE, COAD, CAS, COED). */
    public function isDepartmentTreasurer(): bool
    {
        $this->loadMissing('role');

        return $this->role?->name === 'Department Treasurer' && $this->department_id !== null;
    }

    /** Guidance Counselor (and legacy Case Officer / Front Desk roles). */
    public function canManageIncidents(): bool
    {
        return $this->hasAnyPermission([
            'Manage Incident Reports', 'Manage Reports', 'Manage Requests', 'Create Reports',
        ]);
    }

    /** Treasurer (and legacy Case Officer / Finance Reviewer / Front Desk roles). */
    public function canManageFinancial(): bool
    {
        return $this->hasAnyPermission([
            'Manage Financial Requests', 'Manage Requests', 'Manage Requests (Financial)', 'Create Requests',
        ]);
    }

    /**
     * Single source of truth for what this account may open. It is used by the
     * `access:` route middleware AND sent to the admin panel to build the menu.
     */
    public function accessMap(): array
    {
        $incidents = $this->canManageIncidents();
        $financial = $this->canManageFinancial();

        return [
            'incidents' => $incidents,
            'financial' => $financial,
            'records' => $incidents || $financial,
            'users' => $this->hasAnyPermission(['Manage Users']),
            'system' => $this->hasAnyPermission(['Manage System Settings']),
            'audit' => $this->hasAnyPermission(['View Audit Logs', 'Manage System Settings']),
            'communications' => $this->hasAnyPermission(['Send Communications']),
            // Department treasurers: collect donations and hand them to the TMC Treasurer.
            'collections' => $this->isDepartmentTreasurer(),
        ];
    }
}
