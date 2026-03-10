<?php

namespace App\Http\Controllers;

use App\Jobs\TranscribeAudio;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ChunkedAudioController extends Controller
{
    /**
     * Accept a pre-recorded audio file upload and treat it the same as a
     * finalised chunked recording — persist, then dispatch transcription.
     */
    public function importAudio(Request $request, GameSession $session): JsonResponse
    {
        $request->validate([
            'audio' => 'required|file|max:512000',
        ]);

        $file      = $request->file('audio');
        $extension = $file->getClientOriginalExtension() ?: 'audio';
        $finalPath = "sessions/{$session->id}/audio.{$extension}";

        // If there is an existing audio file with a different extension, remove it
        // so we don't leave orphaned files on disk.
        if ($session->audio_path && $session->audio_path !== $finalPath) {
            Storage::disk('local')->delete($session->audio_path);
        }

        $absPath = Storage::disk('local')->path($finalPath);

        if (!is_dir(dirname($absPath))) {
            mkdir(dirname($absPath), 0755, true);
        }

        // Move the uploaded file directly into place
        $file->move(dirname($absPath), basename($absPath));

        $session->update([
            'audio_path'           => $finalPath,
            'transcription_status' => 'pending',
        ]);

        TranscribeAudio::dispatch($session);

        return response()->json(['audio_path' => $finalPath]);
    }

    /**
     * Stream the session's stored audio file as a download.
     */
    public function downloadAudio(GameSession $session): \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\JsonResponse
    {
        if (! $session->audio_path || ! Storage::disk('local')->exists($session->audio_path)) {
            return response()->json(['error' => 'No audio file found for this session.'], 404);
        }

        $absPath   = Storage::disk('local')->path($session->audio_path);
        $extension = pathinfo($session->audio_path, PATHINFO_EXTENSION);
        $filename  = Str::slug($session->title) . '-session-' . ($session->session_number ?? $session->id) . '.' . $extension;

        return response()->streamDownload(function () use ($absPath) {
            $handle = fopen($absPath, 'rb');
            if ($handle === false) {
                return;
            }
            while (! feof($handle)) {
                echo fread($handle, 8192);
            }
            fclose($handle);
        }, $filename, [
            'Content-Type'   => mime_content_type($absPath) ?: 'application/octet-stream',
            'Content-Length' => filesize($absPath),
        ]);
    }

    /**
     * Initialise a new chunked upload session.
     * Returns an upload_id the client uses for all subsequent chunk POSTs.
     */
    public function init(Request $request, GameSession $session): JsonResponse
    {
        $uploadId = Str::uuid()->toString();

        // Create the chunk directory so we can detect stale uploads later if needed
        Storage::disk('local')->makeDirectory("sessions/{$session->id}/chunks/{$uploadId}");

        return response()->json(['upload_id' => $uploadId]);
    }

    /**
     * Accept one chunk of audio data.
     *
     * Expected fields:
     *   upload_id   — uuid returned by init()
     *   chunk_index — 0-based integer, determines reassembly order
     *   chunk       — the audio file blob (webm/ogg)
     */
    public function chunk(Request $request, GameSession $session): JsonResponse
    {
        $request->validate([
            'upload_id'   => 'required|string',
            'chunk_index' => 'required|integer|min:0',
            'chunk'       => 'required|file',
        ]);

        $uploadId   = $request->input('upload_id');
        $index      = (int) $request->input('chunk_index');
        $padded     = str_pad($index, 6, '0', STR_PAD_LEFT); // 000000.part → natural sort order
        $chunkPath  = "sessions/{$session->id}/chunks/{$uploadId}/{$padded}.part";

        $request->file('chunk')->storeAs(
            "sessions/{$session->id}/chunks/{$uploadId}",
            "{$padded}.part",
            'local'
        );

        return response()->json(['stored' => $chunkPath]);
    }

    /**
     * Concatenate all chunks into a single audio file, clean up, and
     * update the session record before dispatching transcription.
     *
     * Expected fields:
     *   upload_id     — uuid returned by init()
     *   total_chunks  — expected chunk count (for validation)
     *   mime_type     — e.g. "audio/webm"
     */
    public function finalize(Request $request, GameSession $session): JsonResponse
    {
        $request->validate([
            'upload_id'    => 'required|string',
            'total_chunks' => 'required|integer|min:1',
            'mime_type'    => 'nullable|string',
        ]);

        $uploadId    = $request->input('upload_id');
        $totalChunks = (int) $request->input('total_chunks');
        $chunkDir = "sessions/{$session->id}/chunks/{$uploadId}";

        // Gather chunk files sorted by name (zero-padded so string sort == numeric sort)
        $files = Storage::disk('local')->files($chunkDir);
        sort($files);

        if (count($files) !== $totalChunks) {
            return response()->json([
                'error' => "Expected {$totalChunks} chunks, found " . count($files),
            ], 422);
        }

        // Determine extension from mime or default to webm
        $mimeType  = $request->input('mime_type', 'audio/webm');
        $extension = match (true) {
            str_contains($mimeType, 'ogg')  => 'ogg',
            str_contains($mimeType, 'wav')  => 'wav',
            str_contains($mimeType, 'mp4')  => 'mp4',
            default                         => 'webm',
        };

        $finalPath = "sessions/{$session->id}/audio.{$extension}";
        $absPath   = Storage::disk('local')->path($finalPath);

        // Ensure the sessions directory exists
        if (!is_dir(dirname($absPath))) {
            mkdir(dirname($absPath), 0755, true);
        }

        // Stream-concatenate chunks — zero extra memory regardless of file size
        $out = fopen($absPath, 'wb');
        if (!$out) {
            return response()->json(['error' => 'Could not open output file.'], 500);
        }

        foreach ($files as $relPath) {
            $absChunk = Storage::disk('local')->path($relPath);
            $in = fopen($absChunk, 'rb');
            if ($in) {
                stream_copy_to_stream($in, $out);
                fclose($in);
            }
        }
        fclose($out);

        // Clean up chunk directory
        Storage::disk('local')->deleteDirectory($chunkDir);

        // Persist + dispatch
        $session->update([
            'audio_path'           => $finalPath,
            'transcription_status' => 'pending',
        ]);

        TranscribeAudio::dispatch($session);

        return response()->json(['audio_path' => $finalPath]);
    }
}
