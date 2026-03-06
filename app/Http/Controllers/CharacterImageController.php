<?php

namespace App\Http\Controllers;

use App\Jobs\GeneratePortrait;
use App\Models\Character;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CharacterImageController extends Controller
{
    public function generate(Request $request, Character $character): JsonResponse
    {
        $style = $request->input('portrait_style', 'lifelike');
        if (! in_array($style, ['lifelike', 'renaissance', 'comic'])) {
            $style = 'lifelike';
        }

        $character->update([
            'portrait_generation_status' => 'idle',
            'portrait_style'             => $style,
        ]);
        GeneratePortrait::dispatch($character);

        return response()->json(['queued' => true]);
    }

    public function cancelGeneration(Character $character): JsonResponse
    {
        // Force the status back to failed so the UI unblocks.
        // The queued job (if still running) will write 'failed' itself eventually;
        // this just unsticks the UI immediately.
        $character->update(['portrait_generation_status' => 'failed']);

        return response()->json(['cancelled' => true]);
    }

    public function status(Character $character): JsonResponse
    {
        $character->refresh();

        return response()->json([
            'status'       => $character->portrait_generation_status,
            'portrait_path' => $character->portrait_path,
        ]);
    }
}
