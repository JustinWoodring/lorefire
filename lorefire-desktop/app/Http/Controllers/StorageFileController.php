<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class StorageFileController extends Controller
{
    /**
     * Stream a file from the local storage disk to the browser.
     * Used to serve images (portraits, party photos) stored outside the public directory.
     */
    public function serve(Request $request, string $path): Response
    {
        if (! Storage::disk('local')->exists($path)) {
            throw new NotFoundHttpException();
        }

        $mime = mime_content_type(Storage::disk('local')->path($path)) ?: 'application/octet-stream';
        $content = Storage::disk('local')->get($path);

        return response($content, 200, [
            'Content-Type'  => $mime,
            'Cache-Control' => 'no-cache, private',
        ]);
    }
}
