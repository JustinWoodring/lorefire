<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    /** z.ai GLM Coding Plan endpoint (requires a coding-plan subscription key). */
    public const ZAI_CODING_URL = 'https://api.z.ai/api/coding/paas/v4';

    /** z.ai standard API endpoint (regular API key, also required for image generation). */
    public const ZAI_STANDARD_URL = 'https://api.z.ai/v1';

    protected $fillable = [
        'key',
        'value',
        'type',
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        if (! $setting) {
            return $default;
        }

        return match ($setting->type) {
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $setting->value,
            'json'    => json_decode($setting->value, true),
            default   => $setting->value,
        };
    }

    public static function set(string $key, mixed $value, string $type = 'string'): void
    {
        $stored = is_array($value) ? json_encode($value) : (string) $value;
        static::updateOrCreate(['key' => $key], ['value' => $stored, 'type' => $type]);
    }
}
