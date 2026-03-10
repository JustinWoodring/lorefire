<?php

namespace App\Services;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

/**
 * PythonSetupService
 *
 * Manages the lifecycle of the bundled Python venv used for WhisperX.
 *
 * Status values stored in AppSetting under 'python_setup_status':
 *   'not_started'  — fresh install, setup.sh has never run
 *   'running'      — setup.sh is currently executing (async)
 *   'ready'        — venv exists and whisperx import succeeds
 *   'failed'       — setup.sh exited non-zero or verification failed
 */
class PythonSetupService
{
    public const STATUS_NOT_STARTED = 'not_started';
    public const STATUS_RUNNING     = 'running';
    public const STATUS_READY       = 'ready';
    public const STATUS_FAILED      = 'failed';

    /**
     * Sanitize a string to valid UTF-8, stripping any bytes that would
     * cause JSON encoding to fail (e.g. pip progress bars, terminal escapes).
     */
    private function sanitize(string $text): string
    {
        // Strip ANSI escape sequences
        $text = preg_replace('/\x1B\[[0-9;]*[A-Za-z]/', '', $text ?? '');
        // Convert to valid UTF-8, replacing invalid sequences
        $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
        // Limit length so the DB value stays reasonable
        return mb_substr($text, -2000);
    }

    public function getStatus(): string
    {
        return AppSetting::get('python_setup_status', self::STATUS_NOT_STARTED);
    }

    public function getLastError(): ?string
    {
        return AppSetting::get('python_setup_error');
    }

    public function isReady(): bool
    {
        return $this->getStatus() === self::STATUS_READY;
    }

    /**
     * Called on every app boot. Re-verifies if status is 'ready', otherwise
     * kicks off setup in the background if not already running.
     */
    public function bootCheck(): void
    {
        $status = $this->getStatus();

        // If venv appears to exist, do a quick verify pass
        if ($this->venvPythonExists()) {
            if ($this->verifyVenv()) {
                AppSetting::set('python_setup_status', self::STATUS_READY);
                AppSetting::set('python_setup_error', '');
                return;
            }
            // venv exists but broken — fall through to re-run setup
        }

        // Don't re-launch if already running
        if ($status === self::STATUS_RUNNING) {
            return;
        }

        // Kick off async setup
        $this->runSetupAsync();
    }

    /**
     * Run setup.sh in the background (non-blocking).
     * Updates AppSetting status as the process progresses.
     */
    public function runSetup(bool $gpu = false): void
    {
        AppSetting::set('python_setup_status', self::STATUS_RUNNING);
        AppSetting::set('python_setup_error', '');

        $setupScript = $this->setupScriptPath();
        $logPath     = storage_path('logs/python_setup.log');

        if (! file_exists($setupScript)) {
            AppSetting::set('python_setup_status', self::STATUS_FAILED);
            AppSetting::set('python_setup_error', "Setup script not found at: {$setupScript}");
            return;
        }

        if (PHP_OS_FAMILY === 'Windows') {
            $args = ['powershell', '-ExecutionPolicy', 'Bypass', '-File', $setupScript];
            if ($gpu) {
                $args[] = '-Gpu';
            }
        } else {
            $args = ['/bin/bash', $setupScript];
            if ($gpu) {
                $args[] = '--gpu';
            }
        }

        $process = new Process($args);
        $process->setTimeout(600); // 10-minute cap

        try {
            $process->run(function (string $type, string $buffer) use ($logPath) {
                file_put_contents($logPath, $buffer, FILE_APPEND | LOCK_EX);
            });

            if ($process->isSuccessful()) {
                if ($this->verifyVenv()) {
                    AppSetting::set('python_setup_status', self::STATUS_READY);
                    AppSetting::set('python_setup_error', '');
                } else {
                    AppSetting::set('python_setup_status', self::STATUS_FAILED);
                    AppSetting::set('python_setup_error', 'Setup completed but whisperx could not be imported. Check ' . $logPath);
                }
            } else {
                $stderr = $this->sanitize($process->getErrorOutput());
                AppSetting::set('python_setup_status', self::STATUS_FAILED);
                AppSetting::set('python_setup_error', $stderr ?: 'Setup script exited with code ' . $process->getExitCode());
                Log::error('[PythonSetup] setup script failed', ['stderr' => $stderr]);
            }
        } catch (\Throwable $e) {
            AppSetting::set('python_setup_status', self::STATUS_FAILED);
            AppSetting::set('python_setup_error', $this->sanitize($e->getMessage()));
            Log::error('[PythonSetup] exception', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Dispatch setup as a background process so boot() returns immediately.
     */
    public function runSetupAsync(bool $gpu = false): void
    {
        AppSetting::set('python_setup_status', self::STATUS_RUNNING);
        AppSetting::set('python_setup_error', '');

        $artisan  = base_path('artisan');
        $logPath  = storage_path('logs/python_setup.log');
        $gpuFlag  = $gpu ? '--gpu' : '';

        // Use artisan command so we have full Laravel context
        if (PHP_OS_FAMILY === 'Windows') {
            // Start-Process is non-blocking; stderr goes to a sidecar file since
            // PowerShell's Start-Process cannot merge streams to one file.
            $artisanEsc = str_replace("'", "''", $artisan);
            $logEsc     = str_replace("'", "''", $logPath);
            $gpuArg     = $gpu ? ", '--gpu'" : '';
            $cmd = "powershell -Command \"Start-Process php -ArgumentList '{$artisanEsc}', 'python:setup'{$gpuArg} -RedirectStandardOutput '{$logEsc}' -NoNewWindow\"";
        } else {
            $cmd = sprintf(
                'php %s python:setup %s >> %s 2>&1 &',
                escapeshellarg($artisan),
                $gpuFlag,
                escapeshellarg($logPath)
            );
        }

        shell_exec($cmd);
    }

    /**
     * Verify the venv is healthy by importing whisperx.
     */
    public function verifyVenv(): bool
    {
        $python = $this->venvPythonPath();
        if (! file_exists($python)) {
            return false;
        }

        $process = new Process([$python, '-c', 'import whisperx']);
        $process->setTimeout(30);
        $process->run();

        return $process->isSuccessful();
    }

    public function venvPythonExists(): bool
    {
        return file_exists($this->venvPythonPath());
    }

    public function venvPythonPath(): string
    {
        if (PHP_OS_FAMILY === 'Windows') {
            return base_path(implode(DIRECTORY_SEPARATOR, ['resources', 'python', 'venv', 'Scripts', 'python.exe']));
        }

        return base_path('resources/python/venv/bin/python');
    }

    public function setupScriptPath(): string
    {
        if (PHP_OS_FAMILY === 'Windows') {
            return base_path(implode(DIRECTORY_SEPARATOR, ['resources', 'python', 'setup.ps1']));
        }

        return base_path('resources/python/setup.sh');
    }

    public function setupLogPath(): string
    {
        return storage_path('logs/python_setup.log');
    }

    public function getSetupLog(int $lastBytes = 4096): string
    {
        $path = $this->setupLogPath();
        if (! file_exists($path)) {
            return '';
        }
        $size = filesize($path);
        if ($size === 0) {
            return '';
        }
        $handle = fopen($path, 'r');
        fseek($handle, max(0, $size - $lastBytes));
        $content = fread($handle, $lastBytes);
        fclose($handle);
        return $content;
    }
}
