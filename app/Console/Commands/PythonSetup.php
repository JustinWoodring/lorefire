<?php

namespace App\Console\Commands;

use App\Services\PythonSetupService;
use Illuminate\Console\Command;

class PythonSetup extends Command
{
    protected $signature   = 'python:setup {--gpu : Install GPU (CUDA) torch instead of CPU}';
    protected $description = 'Install the bundled WhisperX Python venv';

    public function handle(PythonSetupService $service): int
    {
        $gpu = (bool) $this->option('gpu');

        $this->info('[python:setup] Starting WhisperX environment setup' . ($gpu ? ' (GPU mode)' : ' (CPU mode)') . '…');

        $service->runSetup(gpu: $gpu);

        $status = $service->getStatus();

        if ($status === PythonSetupService::STATUS_READY) {
            $this->info('[python:setup] Done — venv is ready.');
            return self::SUCCESS;
        }

        $this->error('[python:setup] Setup failed: ' . ($service->getLastError() ?? 'unknown error'));
        $this->line('Check logs at: ' . $service->setupLogPath());
        return self::FAILURE;
    }
}
