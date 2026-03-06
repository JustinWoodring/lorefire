<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateSceneImage;
use App\Models\SceneArtPrompt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SceneImageController extends Controller
{
    public function generate(Request $request, SceneArtPrompt $scene): JsonResponse
    {
        // Clean up any existing image before re-generating
        if ($scene->image_path) {
            \Illuminate\Support\Facades\Storage::disk('local')->delete($scene->image_path);
            $scene->update(['image_path' => null, 'status' => 'generated']);
        }

        GenerateSceneImage::dispatch($scene);

        return response()->json(['queued' => true]);
    }

    public function cancel(SceneArtPrompt $scene): JsonResponse
    {
        // Force status back to 'generated' so the UI unblocks immediately.
        // Any in-flight job will write 'generated' or 'image_ready' when it
        // finishes, which is fine — the user can re-trigger if needed.
        $scene->update(['status' => 'generated']);

        return response()->json(['cancelled' => true]);
    }

    public function status(SceneArtPrompt $scene): JsonResponse
    {
        $scene->refresh();

        return response()->json([
            'status'     => $scene->status,
            'image_path' => $scene->image_path,
        ]);
    }

    public function update(Request $request, SceneArtPrompt $scene): JsonResponse
    {
        $validated = $request->validate([
            'prompt'          => 'nullable|string|max:2000',
            'negative_prompt' => 'nullable|string|max:2000',
        ]);

        $scene->update($validated);

        return response()->json(['saved' => true]);
    }
}
