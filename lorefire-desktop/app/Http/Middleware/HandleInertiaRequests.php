<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'ziggy' => fn () => [
                ...(new \Tighten\Ziggy\Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error'   => fn () => $request->session()->get('error'),
                'info'    => fn () => $request->session()->get('info'),
            ],
            'python_setup' => fn () => [
                'status'     => AppSetting::get('python_setup_status', 'not_started'),
                'error'      => self::sanitizeUtf8(AppSetting::get('python_setup_error')),
                'onboarding_complete' => (bool) AppSetting::get('onboarding_complete', false),
            ],
        ];
    }

    /**
     * Strip ANSI codes and invalid UTF-8 bytes so the value is always
     * safe to JSON-encode for Inertia.
     */
    private static function sanitizeUtf8(?string $text): ?string
    {
        if ($text === null || $text === '') {
            return $text;
        }
        $text = preg_replace('/\x1B\[[0-9;]*[A-Za-z]/', '', $text);
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
        return mb_substr($text, -2000);
    }
}
