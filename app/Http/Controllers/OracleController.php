<?php

namespace App\Http\Controllers;

use App\Jobs\AskOracle;
use App\Models\AppSetting;
use App\Models\Campaign;
use App\Models\OracleReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class OracleController extends Controller
{
    public function index(): Response
    {
        $campaigns = Campaign::with(['characters', 'gameSessions' => fn ($q) => $q->latest()->limit(5)])->get();
        $provider  = AppSetting::get('llm_provider', 'none');

        return Inertia::render('Oracle/Index', [
            'campaigns' => $campaigns,
            'hasLlm'    => $provider !== 'none',
        ]);
    }

    /**
     * Dispatch the Oracle job and return the reply ID for polling.
     */
    public function ask(Request $request): JsonResponse
    {
        $request->validate([
            'messages'           => 'required|array|min:1',
            'messages.*.role'    => 'required|in:user,assistant',
            'messages.*.content' => 'required|string|max:8000',
            'context'            => 'nullable|array',
        ]);

        $provider = AppSetting::get('llm_provider', 'none');

        if ($provider === 'none') {
            return response()->json(['error' => 'No LLM provider configured. Set one in Settings.'], 422);
        }

        $systemPrompt = $this->buildSystemPrompt($request->input('context', []));
        $messages     = $request->input('messages');

        $reply = OracleReply::create(['status' => 'pending']);

        AskOracle::dispatch($reply, $systemPrompt, $messages);

        return response()->json(['reply_id' => $reply->id]);
    }

    /**
     * Poll for a reply's status and result.
     */
    public function replyStatus(OracleReply $reply): JsonResponse
    {
        return response()->json([
            'status' => $reply->status,
            'reply'  => $reply->reply,
        ]);
    }

    // ── System prompt ──────────────────────────────────────────────────────

    protected function buildSystemPrompt(array $context): string
    {
        $lines = [];
        $lines[] = 'You are the Oracle — a wise, slightly enigmatic advisor to a Dungeons & Dragons group using the Lorefire app. You have access to their campaign data and can answer questions about D&D 5e rules, their characters, session history, NPCs, and anything else they need. Be helpful, clear, and concise. You may use markdown for formatting. When answering rules questions, cite the relevant rule clearly. When referencing their specific characters or campaign, use the data provided.';

        if (! empty($context['campaigns'])) {
            $lines[] = '';
            $lines[] = '## Campaign Data';
            foreach ($context['campaigns'] as $campaign) {
                $lines[] = '';
                $lines[] = "### Campaign: {$campaign['name']}";
                if (! empty($campaign['description'])) {
                    $lines[] = $campaign['description'];
                }

                if (! empty($campaign['characters'])) {
                    $lines[] = '';
                    $lines[] = '**Characters:**';
                    foreach ($campaign['characters'] as $c) {
                        $line = "- {$c['name']}";
                        if ($c['race'] ?? null)  $line .= ", {$c['race']}";
                        if ($c['class'] ?? null) $line .= " {$c['class']}";
                        if ($c['level'] ?? null) $line .= " (Level {$c['level']})";
                        if (($c['current_hp'] ?? null) !== null) $line .= " | HP: {$c['current_hp']}/{$c['max_hp']}";
                        if ($c['armor_class'] ?? null) $line .= " | AC: {$c['armor_class']}";
                        if ($c['gold'] ?? null) $line .= " | Gold: {$c['gold']}";
                        if ($c['experience_points'] ?? null) $line .= " | XP: {$c['experience_points']}";
                        $lines[] = $line;
                    }
                }

                if (! empty($campaign['game_sessions'])) {
                    $lines[] = '';
                    $lines[] = '**Recent Sessions:**';
                    foreach ($campaign['game_sessions'] as $s) {
                        $line = "- Session {$s['session_number']}: {$s['title']}";
                        if ($s['played_at'] ?? null) $line .= " ({$s['played_at']})";
                        $lines[] = $line;
                        if ($s['session_notes'] ?? null) {
                            $lines[] = '  ' . str_replace("\n", "\n  ", trim($s['session_notes']));
                        }
                    }
                }
            }
        }

        return implode("\n", $lines);
    }
}
