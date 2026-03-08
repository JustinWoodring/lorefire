@extends('pdf.layout')

@php
    $playedAt = $session->played_at
        ? \Carbon\Carbon::parse($session->played_at)->format('l, F j, Y')
        : null;

    $scenesIndexed     = $scenes->values();
    $headingSectionIdx = 0; // increments for every section that has a heading
@endphp

@section('title', $session->title . ' — ' . $campaign->name)

@section('content')

{{-- ── Summary page with inline scene images ──────────────────────────── --}}
<div class="page">

  <div class="cover-header">
    <div class="cover-meta">
      {{ $campaign->name }}
      @if($session->session_number) &nbsp;·&nbsp; Session #{{ $session->session_number }} @endif
    </div>
    <h1>{{ $session->title }}</h1>
    @if($playedAt)
      <div class="cover-sub">{{ $playedAt }}</div>
    @endif
  </div>

  @if($campaign->party_image_path)
    <img src="{{ $baseUrl }}/storage-file/{{ $campaign->party_image_path }}" class="party-portrait" alt="Party" />
  @endif

  @if(!empty($sections))
    <div class="summary-body">
      @php $headingSectionIdx = 0; @endphp
      @foreach($sections as $section)
        @php
            $isHeaded      = $section['headingText'] !== null;
            $assignedScene = $isHeaded ? $scenesIndexed->get($headingSectionIdx) : null;
            if ($isHeaded) { $headingSectionIdx++; }
        @endphp

        {{-- Heading --}}
        @if($section['headingHtml'])
          {!! $section['headingHtml'] !!}
        @endif

        {{-- Body (already rendered HTML from CommonMark) --}}
        @if($section['bodyHtml'])
          {!! $section['bodyHtml'] !!}
        @endif

        {{-- Scene image positionally assigned to this headed section --}}
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
  @else
    <p style="color:#6b6050; font-style:italic;">No bardic summary recorded for this session.</p>
  @endif

  <div class="footer">
    <span>{{ $campaign->name }}</span>
    <span>{{ $session->title }}</span>
  </div>
</div>

{{-- ── Overflow page: scenes beyond the number of ## sections ────────── --}}
@php $overflowScenes = $scenesIndexed->slice($headingSectionIdx); @endphp

@if($overflowScenes->count() > 0)
<div class="page">
  <h2>Scene Illustrations</h2>
  <span class="divider"></span>

  <div class="scenes-grid">
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

  <div class="footer">
    <span>{{ $campaign->name }}</span>
    <span>Scene Illustrations</span>
  </div>
</div>
@endif

@endsection
