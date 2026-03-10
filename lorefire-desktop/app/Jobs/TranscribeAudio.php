<?php

namespace App\Jobs;

use App\Models\GameSession;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class TranscribeAudio implements ShouldQueue
{
    use Queueable;

    public int $timeout = 3600; // 1 hour max for long sessions
    public int $tries   = 2;    // allow one retry on genuine failure

    public function __construct(public GameSession $session) {}

    // ── Progress stages ───────────────────────────────────────────────────────
    // Each entry: [ regex to match stderr line, label, percent 0–100 ]
    private const STAGES = [
        ['#\[whisperx\] Loading model#',                  'Loading model…',            5],
        ['#\[whisperx\] Loading audio#',                  'Loading audio…',           15],
        ['#\[whisperx\] Transcribing#',                   'Transcribing…',            25],
        ['#\[whisperx\] Detected language#',              'Detected language…',       60],
        ['#\[whisperx\] Aligning#',                       'Aligning…',                65],
        ['#\[whisperx\] Alignment complete#',             'Alignment complete',        70],
        ['#\[whisperx\] Running speaker diarization#',    'Diarizing speakers…',      80],
        ['#\[whisperx\] Diarization complete#',           'Diarization complete',     90],
        ['#\[whisperx\] Writing output#',                 'Saving transcript…',       95],
        ['#\[whisperx\] Done\\.#',                        'Done',                    100],
    ];

    private function progressPath(): string
    {
        return "sessions/{$this->session->id}/transcription_progress.json";
    }

    private function writeProgress(string $stage, int $percent): void
    {
        Storage::disk('local')->put($this->progressPath(), json_encode([
            'stage'   => $stage,
            'percent' => $percent,
        ]));
    }

    private function cancelPath(): string
    {
        return "sessions/{$this->session->id}/cancel_transcription";
    }

    private function isCancelled(): bool
    {
        return Storage::disk('local')->exists($this->cancelPath());
    }

    private function cleanupCancelSentinel(): void
    {
        Storage::disk('local')->delete($this->cancelPath());
    }

    public function handle(): void
    {
        $this->session->update(['transcription_status' => 'processing']);
        $this->writeProgress('Starting…', 0);

        $audioPath = Storage::path($this->session->audio_path);
        $outputDir = Storage::path("sessions/{$this->session->id}/transcript");
        $transcriptJson = $outputDir . DIRECTORY_SEPARATOR . 'transcript.json';

        $model    = \App\Models\AppSetting::get('whisperx_model', 'base');
        $language = \App\Models\AppSetting::get('whisperx_language', 'en');
        $hfToken  = \App\Models\AppSetting::get('huggingface_token', '');

        $venvPython     = app(\App\Services\PythonSetupService::class)->venvPythonPath();
        $whisperxScript = base_path(implode(DIRECTORY_SEPARATOR, ['resources', 'python', 'run_whisperx.py']));

        $cmd = [
            $venvPython,
            $whisperxScript,
            '--audio',    $audioPath,
            '--output',   $transcriptJson,
            '--model',    $model,
            '--language', $language,
        ];

        if ($hfToken) {
            $cmd[] = '--diarize';
            $cmd[] = '--hf-token';
            $cmd[] = $hfToken;
        }

        $process = new Process($cmd);
        $process->setTimeout(3600);

        // Stream stderr in real-time and update progress after each recognisable line
        $process->start();

        foreach ($process as $type => $line) {
            // Check for cooperative cancellation on every output line
            if ($this->isCancelled()) {
                $process->stop(3); // SIGTERM, wait up to 3 s, then SIGKILL
                $this->cleanupCancelSentinel();
                Storage::disk('local')->delete($this->progressPath());
                $this->session->update(['transcription_status' => 'cancelled']);
                return;
            }

            if ($type !== Process::ERR) {
                continue;
            }
            foreach (self::STAGES as [$pattern, $label, $percent]) {
                if (preg_match($pattern, $line)) {
                    $this->writeProgress($label, $percent);
                    break;
                }
            }
        }

        if (! $process->isSuccessful()) {
            $this->writeProgress('Failed', 0);
            $this->session->update(['transcription_status' => 'failed']);
            throw new \RuntimeException('WhisperX failed: ' . $process->getErrorOutput());
        }

        // Set status to done first so the poller never sees processing + no progress file
        $this->session->update([
            'transcript_path'      => "sessions/{$this->session->id}/transcript/transcript.json",
            'transcription_status' => 'done',
        ]);

        // Clean up sentinel and progress file — poller already got status=done above
        $this->cleanupCancelSentinel();
        Storage::disk('local')->delete($this->progressPath());

        AnalyzeCombat::dispatch($this->session);
    }

    public function failed(\Throwable $exception): void
    {
        $this->cleanupCancelSentinel();
        $this->writeProgress('Failed', 0);
        $this->session->update(['transcription_status' => 'failed']);
    }
}
