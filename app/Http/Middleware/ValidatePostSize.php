<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Replaces Laravel's built-in ValidatePostSize middleware.
 *
 * NativePHP embeds its own PHP binary with no accessible php.ini, so
 * ini_set('post_max_size') has no effect at runtime. Rather than fight the
 * PHP SAPI limit (which throws a 413 before Laravel even boots on very large
 * requests), we raise the limit to 100 MB via the PHP_INI_PERDIR-compatible
 * approach and disable the Laravel-level check — this is a local desktop app
 * with no public exposure.
 *
 * The actual upload size limit is still enforced per-field by Laravel's
 * validation rules (e.g. 'portrait' => 'file|image|max:10240').
 */
class ValidatePostSize
{
    public function handle(Request $request, Closure $next): Response
    {
        // Skip the post_max_size gate entirely — validation rules enforce
        // per-field maximums, which is sufficient for a local app.
        return $next($request);
    }
}
