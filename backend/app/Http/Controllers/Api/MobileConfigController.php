<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MobileConfigController extends Controller
{
    public function getConfig()
    {
        return response()->json([
            'api_key' => config('app.api_key', 'sk_live_' . bin2hex(random_bytes(20))),
            'app_version' => '1.0.0',
            'min_version' => '1.0.0',
            'force_update' => false,
            'update_message' => 'A new version is available! Please update to continue using the app.',
        ]);
    }
}