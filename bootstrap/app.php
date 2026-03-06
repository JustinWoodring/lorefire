<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Replace the default ValidatePostSize middleware with our own that
        // allows larger uploads (photos). NativePHP embeds PHP with no accessible
        // php.ini, so ini_set('post_max_size') has no effect — we must bypass
        // the middleware check instead.
        $middleware->replace(
            \Illuminate\Http\Middleware\ValidatePostSize::class,
            \App\Http\Middleware\ValidatePostSize::class,
        );

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        $middleware->validateCsrfTokens(except: [
            'sessions/*/record/stop',
            'sessions/*/generate-summary',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
