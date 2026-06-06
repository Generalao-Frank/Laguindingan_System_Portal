<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ActivityLog; // Inimport natin ang ActivityLog model mo
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{
    public function showLoginForm()
    {
        return view('auth.login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        // Restrict: Only Admin can login via web
        if ($user && !$user->isAdmin()) {
            return back()->withErrors([
                'username' => 'Only Admins can access the web portal. Teachers and Students must use the mobile app.'
            ])->withInput();
        }

        if (Auth::attempt(['username' => $request->username, 'password' => $request->password], $request->remember)) {
            $request->session()->regenerate();

            // --- DAGDAG: Mag-record ng LOGIN activity log ---
            ActivityLog::create([
                'user_id'     => Auth::id(),
                'action_type' => 'LOGIN',
                'table_name'  => 'users',
                'record_id'   => Auth::id(),
                'description' => Auth::user()->first_name . ' ' . Auth::user()->last_name . ' logged into the admin portal.',
                'ip_address'  => $request->ip(),
            ]);

            return redirect()->route('admin.dashboard');
        }

        return back()->withErrors([
            'username' => 'The provided credentials do not match our records.'
        ])->withInput();
    }

    public function logout(Request $request)
    {
        // --- DAGDAG: Mag-record ng LOGOUT activity log bago sirain ang session ---
        if (Auth::check()) {
            ActivityLog::create([
                'user_id'     => Auth::id(),
                'action_type' => 'LOGOUT',
                'table_name'  => 'users',
                'record_id'   => Auth::id(),
                'description' => Auth::user()->first_name . ' ' . Auth::user()->last_name . ' logged out of the admin portal.',
                'ip_address'  => $request->ip(),
            ]);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        
        return redirect('/login')->with('success', 'Logged out successfully.');
    }
}