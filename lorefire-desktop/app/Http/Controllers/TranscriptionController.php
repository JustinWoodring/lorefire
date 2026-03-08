<?php

namespace App\Http\Controllers;

use App\Jobs\TranscribeAudio;
use App\Jobs\GenerateBardicSummary;
use App\Jobs\GenerateArtPrompts;
use App\Jobs\ExtractSessionDetails;
use App\Models\GameSession;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TranscriptionController extends Controller
{
    /**
     * Accept a recorded audio blob, save it, and immediately dispatch transcription.
     */
    public function stopRecording(Request $request, GameSession $session): JsonResponse
    {
        $request->validate([
            'audio' => 'required|file|mimes:webm,ogg,wav,mp4|max:512000', // 500 MB
        ]);

        $path = $request->file('audio')->store("sessions/{$session->id}", 'local');

        $session->update([
            'audio_path'           => $path,
            'transcription_status' => 'pending',
        ]);

        TranscribeAudio::dispatch($session);

        return response()->json(['audio_path' => $path]);
    }

    /**
     * Dispatch the WhisperX transcription job.
     */
    public function transcribe(Request $request, GameSession $session): RedirectResponse
    {
        if (! $session->audio_path) {
            return back()->withErrors(['audio' => 'No audio file found for this session.']);
        }

        $session->update(['transcription_status' => 'pending']);
        TranscribeAudio::dispatch($session);

        return back()->with('success', 'Transcription queued.');
    }

    /**
     * Dispatch the bardic summary generation job.
     */
    public function generateSummary(Request $request, GameSession $session): JsonResponse|RedirectResponse
    {
        if (! $session->transcript_path) {
            return back()->withErrors(['transcript' => 'No transcript found. Transcribe the session first.']);
        }

        $session->update(['summary_status' => 'generating']);
        GenerateBardicSummary::dispatch($session);

        if ($request->expectsJson() || ! $request->header('X-Inertia')) {
            return response()->json(['queued' => true]);
        }

        return back()->with('success', 'Bardic summary generation queued.');
    }

    /**
     * JSON endpoint for polling summary generation status.
     */
    public function summaryStatus(GameSession $session): JsonResponse
    {
        $session->refresh();
        return response()->json([
            'status'        => $session->summary_status,
            'summary'       => $session->summary,
            'session_notes' => $session->session_notes,
        ]);
    }

    /**
     * JSON endpoint for polling transcription status.
     */
    public function transcriptionStatus(GameSession $session): JsonResponse
    {
        $session->refresh();

        $progress = null;
        $progressPath = "sessions/{$session->id}/transcription_progress.json";
        if (Storage::disk('local')->exists($progressPath)) {
            $raw = Storage::disk('local')->get($progressPath);
            $progress = json_decode($raw, true);
        }

        return response()->json([
            'status'          => $session->transcription_status,
            'transcript_path' => $session->transcript_path,
            'progress'        => $progress, // null | { stage: string, percent: int }
        ]);
    }

    /**
     * Cancel a pending or in-progress transcription.
     *
     * For a pending job: delete it from the queue before it is picked up.
     * For a running job: write a sentinel file the job checks each loop iteration.
     * Either way, mark the session status as 'cancelled'.
     */
    public function cancelTranscription(GameSession $session): JsonResponse
    {
        $session->refresh();

        $status = $session->transcription_status;

        if (! in_array($status, ['pending', 'processing'])) {
            return response()->json(['error' => 'No active transcription to cancel.'], 422);
        }

        // Remove any pending (not yet reserved) jobs for this session from the queue.
        // We match on the serialised session id inside the payload JSON.
        DB::table('jobs')
            ->whereNull('reserved_at')
            ->where('payload', 'like', '%"TranscribeAudio"%')
            ->where('payload', 'like', '%"id":' . $session->id . '%')
            ->delete();

        // Write the sentinel file so a running job will cooperatively stop.
        Storage::disk('local')->put(
            "sessions/{$session->id}/cancel_transcription",
            '1'
        );

        // Clean up the progress file so the UI doesn't show stale data.
        Storage::disk('local')->delete("sessions/{$session->id}/transcription_progress.json");

        $session->update(['transcription_status' => 'cancelled']);

        return response()->json(['cancelled' => true]);
    }

    /**
     * Dispatch art prompt generation job.
     */
    public function generateArtPrompts(Request $request, GameSession $session): RedirectResponse
    {
        if (! $session->transcript_path && ! $session->summary) {
            return back()->withErrors(['transcript' => 'No transcript or summary found.']);
        }

        $session->update(['art_prompts_status' => 'generating']);

        GenerateArtPrompts::dispatch($session);

        return back()->with('success', 'Art prompt generation queued.');
    }

    /**
     * Cancel a pending or in-progress art prompt generation.
     *
     * For a pending job: delete it from the queue before it is picked up.
     * For a running job: set status to 'cancelled' so the job cooperatively bails
     * after the current LLM HTTP call returns (mid-HTTP cannot be interrupted).
     */
    public function cancelArtPrompts(GameSession $session): JsonResponse
    {
        $session->refresh();

        $status = $session->art_prompts_status;

        if (! in_array($status, ['generating'])) {
            return response()->json(['error' => 'No active art prompt generation to cancel.'], 422);
        }

        // Remove any pending (not yet reserved) GenerateArtPrompts jobs for this session.
        DB::table('jobs')
            ->whereNull('reserved_at')
            ->where('payload', 'like', '%"GenerateArtPrompts"%')
            ->where('payload', 'like', '%"id":' . $session->id . '%')
            ->delete();

        // Mark as cancelled — the job checks this after its LLM call returns.
        $session->update(['art_prompts_status' => 'cancelled']);

        return response()->json(['cancelled' => true]);
    }

    /**
     * Return current art prompts generation status + fresh prompts when done.
     */
    public function artPromptsStatus(GameSession $session): JsonResponse
    {
        $session->refresh();

        $data = ['status' => $session->art_prompts_status];

        if ($session->art_prompts_status === 'done') {
            $data['scene_art_prompts'] = $session->sceneArtPrompts()
                ->get()
                ->map(fn ($p) => $p->toArray())
                ->values();
        }

        return response()->json($data);
    }

    /**
     * Dispatch the session detail extraction job (character updates + NPCs).
     */
    public function extractDetails(GameSession $session): JsonResponse
    {
        if (! $session->transcript_path) {
            return response()->json(['error' => 'No transcript found. Transcribe the session first.'], 422);
        }

        $session->update(['extraction_status' => 'generating']);
        ExtractSessionDetails::dispatch($session);

        return response()->json(['queued' => true]);
    }

    /**
     * Poll extraction status.
     */
    public function extractionStatus(GameSession $session): JsonResponse
    {
        $session->refresh();
        return response()->json(['status' => $session->extraction_status]);
    }
}
