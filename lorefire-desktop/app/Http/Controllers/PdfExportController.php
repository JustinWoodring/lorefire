<?php

namespace App\Http\Controllers;

use App\Jobs\ExportPdf;
use App\Models\Campaign;
use App\Models\GameSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use League\CommonMark\CommonMarkConverter;

class PdfExportController extends Controller
{
    private CommonMarkConverter $markdown;

    public function __construct()
    {
        $this->markdown = new CommonMarkConverter([
            'html_input'         => 'strip',
            'allow_unsafe_links' => false,
        ]);
    }

    /**
     * Dispatch a PDF export job for a single session.
     * Returns immediately with a cache key the client can poll.
     */
    public function session(Campaign $campaign, GameSession $session): JsonResponse
    {
        $session->load('sceneArtPrompts');

        $html = view('pdf.session', [
            'campaign' => $campaign,
            'session'  => $session,
            'scenes'   => $session->sceneArtPrompts()->whereNotNull('image_path')->get(),
            'sections' => $this->parseSummaryIntoSections($session->summary ?? ''),
            'baseUrl'  => rtrim(url('/'), '/'),
        ])->render();

        $filename = $this->slugify($campaign->name . ' - ' . $session->title) . '.pdf';

        return response()->json(['key' => $this->enqueue($html, $filename)]);
    }

    /**
     * Dispatch a PDF export job for a full campaign chronicle.
     * Returns immediately with a cache key the client can poll.
     */
    public function campaign(Campaign $campaign): JsonResponse
    {
        $sessions = $campaign->gameSessions()
            ->whereNotNull('summary')
            ->orderBy('played_at')
            ->orderBy('session_number')
            ->with('sceneArtPrompts')
            ->get();

        // Pre-parse sections for every session so the template gets rendered HTML
        $sessionSections = $sessions->mapWithKeys(function ($session) {
            return [$session->id => $this->parseSummaryIntoSections($session->summary ?? '')];
        });

        $html = view('pdf.campaign', [
            'campaign'        => $campaign,
            'sessions'        => $sessions,
            'sessionSections' => $sessionSections,
            'baseUrl'         => rtrim(url('/'), '/'),
        ])->render();

        $filename = $this->slugify($campaign->name . ' - Chronicle') . '.pdf';

        return response()->json(['key' => $this->enqueue($html, $filename)]);
    }

    /**
     * Poll the status of a PDF export job.
     * Returns { status: 'pending' | 'done' | 'failed', filename?, error? }
     */
    public function status(Request $request): JsonResponse
    {
        $key  = $request->query('key');
        $data = Cache::get($key);

        return response()->json($data ?? ['status' => 'pending']);
    }

    /**
     * Split a markdown summary into sections, each with:
     *   - headingHtml: rendered <h2> string or null for a preamble
     *   - bodyHtml:    rendered HTML of the section body paragraphs
     *
     * Sections are split on # / ## headings. The heading itself is rendered
     * separately so the Blade template can inject a scene image between the
     * heading+body block and the next heading.
     */
    private function parseSummaryIntoSections(string $markdown): array
    {
        if (trim($markdown) === '') {
            return [];
        }

        // Split raw markdown lines into chunks at every # / ## boundary
        $rawSections = [];
        $current     = ['heading' => null, 'lines' => []];

        foreach (explode("\n", $markdown) as $line) {
            $t = trim($line);
            if (str_starts_with($t, '### ') || str_starts_with($t, '## ') || str_starts_with($t, '# ')) {
                if ($current['heading'] !== null || count($current['lines']) > 0) {
                    $rawSections[] = $current;
                }
                if (str_starts_with($t, '### ')) {
                    $headingText = substr($t, 4);
                } elseif (str_starts_with($t, '## ')) {
                    $headingText = substr($t, 3);
                } else {
                    $headingText = substr($t, 2);
                }
                $current = ['heading' => trim($headingText), 'lines' => []];
            } else {
                $current['lines'][] = $line; // keep original line (not trimmed) for markdown fidelity
            }
        }
        if ($current['heading'] !== null || count($current['lines']) > 0) {
            $rawSections[] = $current;
        }

        // Render each section's body through CommonMark
        return array_map(function (array $sec) {
            $bodyMarkdown = implode("\n", $sec['lines']);
            $bodyHtml     = trim((string) $this->markdown->convert($bodyMarkdown));

            return [
                'headingText' => $sec['heading'],           // plain text, for display
                'headingHtml' => $sec['heading']
                    ? '<h2>' . e($sec['heading']) . '</h2>'
                    : null,
                'bodyHtml'    => $bodyHtml,
            ];
        }, $rawSections);
    }

    /**
     * Write HTML to a temp file, seed the cache key as pending, dispatch the job.
     */
    private function enqueue(string $html, string $filename): string
    {
        $key     = 'pdf_export_' . Str::uuid()->toString();
        $tmpHtml = tempnam(sys_get_temp_dir(), 'lorefire_pdf_') . '.html';
        file_put_contents($tmpHtml, $html);

        Cache::put($key, ['status' => 'pending'], now()->addMinutes(10));

        ExportPdf::dispatch($key, $filename, $tmpHtml);

        return $key;
    }

    private function slugify(string $text): string
    {
        return preg_replace('/[^a-z0-9]+/', '-', strtolower($text));
    }
}
