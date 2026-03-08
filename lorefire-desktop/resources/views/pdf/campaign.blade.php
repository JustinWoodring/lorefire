@extends('pdf.layout')

@section('title', $campaign->name . ' — Chronicle')

@section('content')

{{-- ── Cover page ──────────────────────────────────────────────────────── --}}
<div class="page" style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">

  @if($campaign->party_image_path)
    <img src="{{ $baseUrl }}/storage-file/{{ $campaign->party_image_path }}"
         style="width:100%; aspect-ratio:10/7; object-fit:contain; background:#0e0c0a; border-radius:2mm; border:1px solid #2e2a22; margin-bottom:10mm;"
         alt="Party portrait" />
  @endif

  <div style="font-family:'Cinzel',serif; font-size:9pt; color:#8b6c3e; letter-spacing:0.2em; text-transform:uppercase; margin-bottom:4mm;">
    A Chronicle of
  </div>
  <h1 style="font-size:28pt; margin-bottom:3mm;">{{ $campaign->name }}</h1>

  @if($campaign->setting)
    <div style="font-size:10pt; color:#6b6050; margin-bottom:2mm;">{{ $campaign->setting }}</div>
  @endif
  @if($campaign->dm_name)
    <div style="font-size:9pt; color:#6b6050;">Dungeon Master: {{ $campaign->dm_name }}</div>
  @endif

  <span class="divider" style="margin-top:8mm;"></span>

  <div style="font-family:'Cinzel',serif; font-size:8pt; color:#6b6050; letter-spacing:0.15em; text-transform:uppercase; margin-top:4mm;">
    {{ $sessions->count() }} Session{{ $sessions->count() !== 1 ? 's' : '' }} Recorded
  </div>

  <div class="footer">
    <span>{{ $campaign->name }}</span>
    <span>Chronicle</span>
  </div>
</div>

{{-- ── One page-block per session ─────────────────────────────────────── --}}
@foreach($sessions as $session)
@php
    $playedAt      = $session->played_at
        ? \Carbon\Carbon::parse($session->played_at)->format('F j, Y')
        : null;
    $sessionScenes = $session->sceneArtPrompts->whereNotNull('image_path')->values();
    $sections      = $sessionSections[$session->id] ?? [];
    $headingIdx    = 0;
@endphp

<div class="page">

  <div class="cover-header">
    <div class="cover-meta">
      @if($session->session_number) Session #{{ $session->session_number }} &nbsp;·&nbsp; @endif
      {{ $campaign->name }}
    </div>
    <h1 style="font-size:18pt;">{{ $session->title }}</h1>
    @if($playedAt)
      <div class="cover-sub">{{ $playedAt }}</div>
    @endif
  </div>

  @if(!empty($sections))
    <div class="summary-body">
      @php $headingIdx = 0; @endphp
      @foreach($sections as $section)
        @php
            $isHeaded      = $section['headingText'] !== null;
            $assignedScene = $isHeaded ? $sessionScenes->get($headingIdx) : null;
            if ($isHeaded) { $headingIdx++; }
        @endphp

        @if($section['headingHtml'])
          {!! $section['headingHtml'] !!}
        @endif

        @if($section['bodyHtml'])
          {!! $section['bodyHtml'] !!}
        @endif

        @if($assignedScene && $assignedScene->image_path)
          <div class="scene-inline-wrap">
            <div class="scene-inline">
              <img src="{{ $baseUrl }}/storage-file/{{ $assignedScene->image_path }}"
                   alt="{{ $assignedScene->scene_title }}" />
              @if($assignedScene->scene_title)
                <div class="scene-label">{{ $assignedScene->scene_title }}</div>
              @endif
            </div>
          </div>
        @endif

      @endforeach
    </div>
  @endif

  {{-- Overflow scenes beyond the number of ## sections --}}
  @php $overflowScenes = $sessionScenes->slice($headingIdx); @endphp
  @if($overflowScenes->count() > 0)
    <div class="scenes-grid" style="margin-top:4mm;">
      @foreach($overflowScenes as $scene)
        @if($scene->image_path)
          <div class="scene-card">
            <img src="{{ $baseUrl }}/storage-file/{{ $scene->image_path }}"
                 alt="{{ $scene->scene_title ?? 'Scene' }}" />
            @if($scene->scene_title)
              <div class="scene-label">{{ $scene->scene_title }}</div>
            @endif
          </div>
        @endif
      @endforeach
    </div>
  @endif

  <div class="footer">
    <span>{{ $campaign->name }}</span>
    <span>{{ $session->title }}</span>
  </div>
</div>

@endforeach

@endsection
