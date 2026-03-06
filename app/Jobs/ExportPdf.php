<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Models\GameSession;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Native\Laravel\Facades\Shell;
use Native\Laravel\Facades\System;

class ExportPdf implements ShouldQueue
{
    use Queueable;

    public int $timeout = 120;

    public function __construct(
        public string    $cacheKey,
        public string    $filename,
        public string    $htmlPath,
    ) {}

    public function handle(): void
    {
        try {
            $pdfBase64 = System::printToPDFFromUrl('file://' . $this->htmlPath, [
                'pageSize'        => 'A4',
                'printBackground' => true,
                'margins'         => ['top' => 0, 'bottom' => 0, 'left' => 0, 'right' => 0],
            ]);

            $dest = rtrim(getenv('HOME') ?: sys_get_temp_dir(), '/') . '/Downloads/' . $this->filename;
            file_put_contents($dest, base64_decode($pdfBase64));

            Shell::openFile($dest);

            Cache::put($this->cacheKey, ['status' => 'done', 'filename' => $this->filename], now()->addMinutes(5));
        } finally {
            @unlink($this->htmlPath);
        }
    }

    public function failed(\Throwable $e): void
    {
        @unlink($this->htmlPath);
        Cache::put($this->cacheKey, ['status' => 'failed', 'error' => $e->getMessage()], now()->addMinutes(5));
        Log::error('ExportPdf failed', ['error' => $e->getMessage(), 'key' => $this->cacheKey]);
    }
}
