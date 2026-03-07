<?php

namespace App\Jobs;

use App\Models\AppSetting;
use App\Models\OracleReply;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AskOracle implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(
        public OracleReply $reply,
        public string $systemPrompt,
        public array $messages,
    ) {}

    public function handle(): void
    {
        $provider = AppSetting::get('llm_provider', 'none');

        $text = match ($provider) {
            'openai'    => $this->callOpenAI(),
            'anthropic' => $this->callAnthropic(),
            'ollama'    => $this->callOllama(),
            'zai'       => $this->callZai(),
            default     => null,
        };

        if ($text === null) {
            $this->reply->update(['status' => 'failed']);
            return;
        }

        $this->reply->update(['status' => 'done', 'reply' => $text]);
    }

    public function failed(\Throwable $e): void
    {
        $this->reply->update(['status' => 'failed']);
        Log::error('AskOracle job failed', ['error' => $e->getMessage()]);
    }

    // ── Providers ──────────────────────────────────────────────────────────

    protected function callZai(): ?string
    {
        $key     = AppSetting::get('zai_api_key');
        $model   = AppSetting::get('zai_model', 'glm-4.6');
        $baseUrl = AppSetting::get('zai_base_url', AppSetting::ZAI_CODING_URL);

        if (! $key) return null;

        $payload = [
            'model'      => $model,
            'messages'   => array_merge(
                [['role' => 'system', 'content' => $this->systemPrompt]],
                $this->messages
            ),
            'max_tokens' => 4000,
        ];

        if (str_contains($model, '4.7') || str_contains($model, '4-7')) {
            $payload['thinking']   = ['type' => 'enabled'];
            $payload['max_tokens'] = 8000;
        }

        $response = Http::withToken($key)
            ->timeout(240)
            ->post(rtrim($baseUrl, '/') . '/chat/completions', $payload);

        if (! $response->successful()) {
            Log::warning('AskOracle: z.ai error', ['status' => $response->status(), 'body' => $response->body()]);
            return null;
        }

        $content = $response->json('choices.0.message.content') ?? '';

        if (is_array($content)) {
            $content = collect($content)->where('type', 'text')->pluck('text')->implode("\n");
        }

        return empty(trim((string) $content)) ? null : trim($content);
    }

    protected function callOpenAI(): ?string
    {
        $key = AppSetting::get('openai_api_key');
        if (! $key) return null;

        $response = Http::withToken($key)
            ->timeout(120)
            ->post('https://api.openai.com/v1/chat/completions', [
                'model'      => 'gpt-4o-mini',
                'messages'   => array_merge(
                    [['role' => 'system', 'content' => $this->systemPrompt]],
                    $this->messages
                ),
                'max_tokens' => 2000,
            ]);

        if (! $response->successful()) {
            Log::warning('AskOracle: OpenAI error', ['status' => $response->status()]);
            return null;
        }

        return $response->json('choices.0.message.content') ?? null;
    }

    protected function callAnthropic(): ?string
    {
        $key = AppSetting::get('anthropic_api_key');
        if (! $key) return null;

        $response = Http::withHeaders([
            'x-api-key'         => $key,
            'anthropic-version' => '2023-06-01',
        ])
            ->timeout(120)
            ->post('https://api.anthropic.com/v1/messages', [
                'model'      => 'claude-3-haiku-20240307',
                'max_tokens' => 2000,
                'system'     => $this->systemPrompt,
                'messages'   => $this->messages,
            ]);

        if (! $response->successful()) {
            Log::warning('AskOracle: Anthropic error', ['status' => $response->status()]);
            return null;
        }

        return $response->json('content.0.text') ?? null;
    }

    protected function callOllama(): ?string
    {
        $baseUrl = AppSetting::get('ollama_base_url', 'http://localhost:11434');
        $model   = AppSetting::get('ollama_model', 'llama3');

        $response = Http::timeout(240)
            ->post("{$baseUrl}/api/chat", [
                'model'    => $model,
                'stream'   => false,
                'messages' => array_merge(
                    [['role' => 'system', 'content' => $this->systemPrompt]],
                    $this->messages
                ),
            ]);

        if (! $response->successful()) {
            Log::warning('AskOracle: Ollama error', ['status' => $response->status()]);
            return null;
        }

        return $response->json('message.content') ?? null;
    }
}
