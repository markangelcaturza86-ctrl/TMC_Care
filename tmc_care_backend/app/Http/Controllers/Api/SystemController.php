<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SystemController extends Controller
{
    public const VERSION = '1.0.0';
    public const DEFAULT_NAME = 'TMC-Care';

    public function show()
    {
        return response()->json($this->payload());
    }

    /** Super Administrator only. */
    public function update(Request $request)
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Only the Super Administrator can change system settings.');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:40'],
        ]);

        $name = trim($data['name']);
        SystemSetting::write('system_name', $name);

        AuditLog::record($request->user()->name, "Changed the system name to \"{$name}\"");

        return response()->json($this->payload());
    }

    private function payload(): array
    {
        return [
            'name' => SystemSetting::read('system_name', self::DEFAULT_NAME),
            'version' => self::VERSION,
        ];
    }
}
