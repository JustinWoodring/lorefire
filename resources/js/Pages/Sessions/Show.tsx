import React, { useState, useRef, useEffect } from 'react'
import { Head, router } from '@inertiajs/react'
import { useRecording } from '@/Contexts/RecordingContext'
import { usePdfExport } from '@/hooks/usePdfExport'
import ReactMarkdown from 'react-markdown'
import AppLayout from '@/Layouts/AppLayout'
import { Card, CardHeader } from '@/Components/Card'
import { Badge } from '@/Components/Badge'
import { Button } from '@/Components/Button'
import { Campaign, GameSession, Encounter, EncounterTurn, SceneArtPrompt, Character, SpeakerProfile } from '@/types'

// ── Speaker Identification Panel ─────────────────────────────────────────────

interface SpeakerRowState {
  displayName: string
  characterId: string
  isDm: boolean
  saving: boolean
  saved: boolean
  error: string | null
}

function SpeakerIdentificationPanel({
  unresolvedLabels,
  transcriptSegments,
  characters,
  sessionId,
}: {
  unresolvedLabels: string[]
  transcriptSegments: TranscriptSegment[]
  characters: Character[]
  sessionId: number
}) {
  const initial: Record<string, SpeakerRowState> = {}
  unresolvedLabels.forEach(label => {
    initial[label] = { displayName: '', characterId: '', isDm: false, saving: false, saved: false, error: null }
  })
  const [rows, setRows] = useState<Record<string, SpeakerRowState>>(initial)

  const setRow = (label: string, patch: Partial<SpeakerRowState>) => {
    setRows(prev => ({ ...prev, [label]: { ...prev[label], ...patch } }))
  }

  const save = (label: string) => {
    const row = rows[label]
    if (!row.displayName.trim()) {
      setRow(label, { error: 'Name is required' })
      return
    }
    setRow(label, { saving: true, error: null })

    router.post(`/sessions/${sessionId}/speakers`, {
      speaker_label: label,
      display_name: row.displayName.trim(),
      is_dm: row.isDm ? 1 : 0,
      character_id: row.characterId ? Number(row.characterId) : '',
    }, {
      preserveScroll: true,
      onSuccess: () => {
        setRow(label, { saving: false, saved: true })
      },
      onError: () => {
        setRow(label, { saving: false, error: 'Failed to save. Try again.' })
      },
    })
  }

  // Get up to 3 sample lines per speaker
  const samplesFor = (label: string) =>
    transcriptSegments
      .filter(s => s.speaker_label === label)
      .slice(0, 3)

  const pendingLabels = unresolvedLabels.filter(l => !rows[l]?.saved)
  const savedLabels   = unresolvedLabels.filter(l =>  rows[l]?.saved)

  if (pendingLabels.length === 0 && savedLabels.length === 0) return null

  return (
    <div className="mb-4 rounded border border-[var(--color-rune)] bg-[var(--color-surface)] p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune-bright)" strokeWidth="1.5">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          <path d="M16 3l2 2-2 2" />
        </svg>
        <span className="font-heading text-xs uppercase tracking-widest text-[var(--color-rune-bright)]">
          Identify Speakers
        </span>
        <span className="text-[10px] text-[var(--color-text-dim)]">
          — {pendingLabels.length} unresolved label{pendingLabels.length !== 1 ? 's' : ''}
        </span>
      </div>

      {pendingLabels.map(label => {
        const row = rows[label]
        const samples = samplesFor(label)

        return (
          <div
            key={label}
            className="runic-card p-3 flex flex-col gap-2"
          >
            {/* Label header */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[10px] text-[var(--color-text-dim)] bg-[var(--color-bg)] px-1.5 py-0.5 rounded">
                {label}
              </span>
              {row.saved && (
                <span className="text-[10px] text-[var(--color-success)]">Saved</span>
              )}
            </div>

            {/* Sample lines */}
            {samples.length > 0 && (
              <div className="flex flex-col gap-1 pl-1 border-l-2 border-[var(--color-border)] mb-1">
                {samples.map((seg, i) => (
                  <p key={i} className="text-[10px] text-[var(--color-text-dim)] italic leading-relaxed">
                    "{seg.text.trim()}"
                  </p>
                ))}
              </div>
            )}

            {/* Form row */}
            <div className="flex flex-wrap items-end gap-2">
              {/* Display name */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wide">Name</label>
                <input
                  type="text"
                  value={row.displayName}
                  onChange={e => setRow(label, { displayName: e.target.value, error: null })}
                  placeholder="e.g. Justin"
                  className="h-7 px-2 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text-base)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-rune)] w-28"
                />
              </div>

              {/* Character dropdown */}
              {characters.length > 0 && (
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wide">Character</label>
                  <select
                    value={row.characterId}
                    onChange={e => setRow(label, { characterId: e.target.value })}
                    className="h-7 px-2 text-xs bg-[var(--color-bg)] border border-[var(--color-border)] rounded text-[var(--color-text-base)] focus:outline-none focus:border-[var(--color-rune)] w-32"
                  >
                    <option value="">— none —</option>
                    {characters.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* DM checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer pb-0.5">
                <input
                  type="checkbox"
                  checked={row.isDm}
                  onChange={e => setRow(label, { isDm: e.target.checked })}
                  className="w-3 h-3 accent-[var(--color-rune)]"
                />
                <span className="text-[10px] text-[var(--color-text-dim)] uppercase tracking-wide">DM</span>
              </label>

              {/* Save */}
              <Button
                variant="rune"
                size="sm"
                onClick={() => save(label)}
                disabled={row.saving || row.saved}
              >
                {row.saving ? 'Saving…' : row.saved ? 'Saved' : 'Assign'}
              </Button>
            </div>

            {row.error && (
              <p className="text-[10px] text-[var(--color-danger)]">{row.error}</p>
            )}
          </div>
        )
      })}

      {savedLabels.length > 0 && (
        <p className="text-[10px] text-[var(--color-text-dim)] italic">
          {savedLabels.length} label{savedLabels.length !== 1 ? 's' : ''} assigned — transcript will update on next reload.
        </p>
      )}
    </div>
  )
}

interface TranscriptSegment {
  start: number
  end: number
  text: string
  speaker?: string        // resolved display name
  speaker_label?: string  // raw SPEAKER_XX label
  speaker_is_dm?: boolean
}

interface Props {
  campaign: Campaign
  session: GameSession & {
    encounters: Encounter[]
    scene_art_prompts: SceneArtPrompt[]
  }
  characters: Character[]
  transcriptSegments: TranscriptSegment[] | null
  speakerProfiles: SpeakerProfile[]
  imageGenProvider: string | null
}

export default function Show({ campaign, session, characters, transcriptSegments, speakerProfiles, imageGenProvider }: Props) {
  const {
    isRecording,
    recordingSeconds,
    isUploading,
    uploadProgress,
    activeSessionId,
    startRecording,
    stopRecording,
    registerOnFinalized,
  } = useRecording()

  const [transcriptOpen, setTranscriptOpen] = useState(false)

  const pdf = usePdfExport(`/campaigns/${campaign.id}/sessions/${session.id}/export-pdf`)

  // ── Transcription status (live-polled) ────────────────────────────────────
  const [liveTranscriptionStatus, setLiveTranscriptionStatus] = useState<GameSession['transcription_status']>(
    session.transcription_status
  )
  const [liveHasTranscript, setLiveHasTranscript] = useState(!!session.transcript_path)
  const [liveAudioPath, setLiveAudioPath] = useState<string | null>(session.audio_path)
  const [transcriptionProgress, setTranscriptionProgress] = useState<{ stage: string; percent: number } | null>(null)
  const transcriptionPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTranscriptionPolling = () => {
    if (transcriptionPollRef.current) return // already polling
    transcriptionPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/sessions/${session.id}/transcription-status`)
        const data = await res.json()
        setLiveTranscriptionStatus(data.status)
        setTranscriptionProgress(data.progress ?? null)
        if (data.status === 'done') {
          clearInterval(transcriptionPollRef.current!)
          transcriptionPollRef.current = null
          setTranscriptionProgress(null)
          setLiveHasTranscript(true)
          // Reload transcript segments and speaker profiles without full page reload
          router.reload({ only: ['transcriptSegments', 'speakerProfiles', 'session'] })
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(transcriptionPollRef.current!)
          transcriptionPollRef.current = null
          setTranscriptionProgress(null)
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000)
  }

  const handleCancelTranscription = async () => {
    // Optimistically update UI first so the button disappears immediately
    setLiveTranscriptionStatus('cancelled')
    if (transcriptionPollRef.current) {
      clearInterval(transcriptionPollRef.current)
      transcriptionPollRef.current = null
    }
    setTranscriptionProgress(null)
    try {
      await fetch(`/sessions/${session.id}/transcription`, {
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
      })
    } catch {
      // Best-effort — the sentinel file may still be picked up by the job
    }
  }

  // ── Summary status (live-polled) ──────────────────────────────────────────
  const [generatingSummary, setGeneratingSummary] = useState(
    session.summary_status === 'generating'
  )
  const [liveSummary, setLiveSummary] = useState<string | null>(session.summary)
  const [liveSessionNotes, setLiveSessionNotes] = useState<string | null>(session.session_notes)
  const [summaryError, setSummaryError] = useState(false)
  const summaryPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startSummaryPolling = () => {
    if (summaryPollRef.current) return
    summaryPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/sessions/${session.id}/summary-status`)
        const data = await res.json()
        if (data.status === 'done') {
          clearInterval(summaryPollRef.current!)
          summaryPollRef.current = null
          setGeneratingSummary(false)
          setLiveSummary(data.summary)
          setLiveSessionNotes(data.session_notes)
        } else if (data.status === 'failed') {
          clearInterval(summaryPollRef.current!)
          summaryPollRef.current = null
          setGeneratingSummary(false)
          setSummaryError(true)
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 2500)
  }

  // ── Art prompts status (live-polled) ─────────────────────────────────────
  const [generatingArtPrompts, setGeneratingArtPrompts] = useState(
    session.art_prompts_status === 'generating'
  )
  const [liveSceneArtPrompts, setLiveSceneArtPrompts] = useState(session.scene_art_prompts ?? [])
  const [artPromptsError, setArtPromptsError] = useState(false)
  const artPromptsPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startArtPromptsPolling = () => {
    if (artPromptsPollRef.current) return
    artPromptsPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/sessions/${session.id}/art-prompts-status`)
        const data = await res.json()
        if (data.status === 'done') {
          clearInterval(artPromptsPollRef.current!)
          artPromptsPollRef.current = null
          setGeneratingArtPrompts(false)
          setLiveSceneArtPrompts(data.scene_art_prompts ?? [])
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(artPromptsPollRef.current!)
          artPromptsPollRef.current = null
          setGeneratingArtPrompts(false)
          if (data.status === 'failed') setArtPromptsError(true)
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 2500)
  }

  const handleCancelArtPrompts = async () => {
    // Optimistically update UI first so the spinner disappears immediately
    setGeneratingArtPrompts(false)
    if (artPromptsPollRef.current) {
      clearInterval(artPromptsPollRef.current)
      artPromptsPollRef.current = null
    }
    try {
      await fetch(`/sessions/${session.id}/art-prompts`, {
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': CSRF() },
      })
    } catch {
      // Best-effort — job will check status on next iteration
    }
  }

  // ── Extraction state (live-polled) ────────────────────────────────────────
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'generating' | 'done' | 'failed'>(
    session.extraction_status ?? 'idle'
  )
  const extractionPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startExtractionPolling = () => {
    if (extractionPollRef.current) return
    extractionPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/sessions/${session.id}/extraction-status`)
        const data = await res.json()
        if (data.status === 'done' || data.status === 'failed') {
          clearInterval(extractionPollRef.current!)
          extractionPollRef.current = null
          setExtractionStatus(data.status)
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 2500)
  }

  const handleExtractDetails = async () => {
    setExtractionStatus('generating')
    await fetch(`/sessions/${session.id}/extract-details`, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': CSRF() },
    })
    startExtractionPolling()
  }

  // ── Recording finalize callback ───────────────────────────────────────────
  // Defined before the mount useEffect so it can be passed to registerOnFinalized.
  const CSRF = () =>
    (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? ''

  /** Called by the context after finalize succeeds or fails. */
  const handleRecordingFinalized = (audioPath: string | null) => {
    if (audioPath) setLiveAudioPath(audioPath)
    setLiveTranscriptionStatus('pending')
    startTranscriptionPolling()
  }

  const [showRerecordConfirm, setShowRerecordConfirm] = useState(false)

  const handleStartRecording = () => {
    if (liveAudioPath) {
      setShowRerecordConfirm(true)
    } else {
      startRecording(session.id, campaign.id, handleRecordingFinalized)
    }
  }

  const confirmRerecord = () => {
    setShowRerecordConfirm(false)
    startRecording(session.id, campaign.id, handleRecordingFinalized)
  }

  // Start polling on mount if already in-progress; re-register finalized callback
  useEffect(() => {
    // Re-register the onFinalized callback so React state setters are fresh
    // even if the user navigated away and came back while recording was active.
    registerOnFinalized(session.id, handleRecordingFinalized)

    if (session.transcription_status === 'pending' || session.transcription_status === 'processing') {
      startTranscriptionPolling()
    }
    if (session.summary_status === 'generating') {
      startSummaryPolling()
    }
    if (session.art_prompts_status === 'generating') {
      startArtPromptsPolling()
    }
    if (session.extraction_status === 'generating') {
      startExtractionPolling()
    }
    return () => {
      if (transcriptionPollRef.current) clearInterval(transcriptionPollRef.current)
      if (summaryPollRef.current) clearInterval(summaryPollRef.current)
      if (artPromptsPollRef.current) clearInterval(artPromptsPollRef.current)
      if (extractionPollRef.current) clearInterval(extractionPollRef.current)
    }
  }, [])

  const generateSummary = () => {
    setGeneratingSummary(true)
    setSummaryError(false)
    fetch(`/sessions/${session.id}/generate-summary`, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
    })
    startSummaryPolling()
  }

  const statusColors: Record<GameSession['transcription_status'], string> = {
    none: 'muted', pending: 'warning', processing: 'arcane', done: 'success', failed: 'danger', cancelled: 'muted',
  }

  // ── Audio file import ─────────────────────────────────────────────────────
  const importFileRef = useRef<HTMLInputElement | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleImportAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      // Read the file into memory first — Electron/WebKit can fail to serialize
      // a File reference directly into a multipart FormData body.
      const arrayBuffer = await file.arrayBuffer()
      const blob = new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' })

      const fd = new FormData()
      fd.append('audio', blob, file.name)

      const res = await fetch(`/sessions/${session.id}/import-audio`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': CSRF() },
        body: fd,
      })
      // Reset input after fetch so the File reference stays valid during upload
      if (importFileRef.current) importFileRef.current.value = ''
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.audio_path) setLiveAudioPath(data.audio_path)
        setLiveTranscriptionStatus('pending')
        startTranscriptionPolling()
      } else {
        const err = await res.json().catch(() => ({}))
        alert('Import failed: ' + (err.message ?? res.statusText))
      }
    } catch {
      if (importFileRef.current) importFileRef.current.value = ''
      alert('Import failed — check the file and try again.')
    } finally {
      setIsImporting(false)
    }
  }

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <>
    <AppLayout breadcrumbs={[
      { label: 'Campaigns', href: '/campaigns' },
      { label: campaign.name, href: `/campaigns/${campaign.id}` },
      { label: session.title },
    ]}>
      <Head title={`${session.title} — ${campaign.name}`} />

      <div className="max-w-5xl mx-auto flex flex-col gap-5">

        {/* ── Session header ───────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {session.session_number && (
                <span className="text-xs text-[var(--color-rune)] font-mono tracking-wider">Session #{session.session_number}</span>
              )}
              <Badge variant={statusColors[liveTranscriptionStatus] as any}>
                {liveTranscriptionStatus === 'none' ? 'No Audio' : liveTranscriptionStatus === 'cancelled' ? 'Cancelled' : liveTranscriptionStatus}
              </Badge>
            </div>
            <h1 className="font-heading text-2xl text-[var(--color-text-white)] tracking-widest uppercase">{session.title}</h1>
            {session.played_at && (
              <p className="text-xs text-[var(--color-text-dim)] mt-1">
                {new Date(session.played_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={pdf.trigger} disabled={pdf.status === 'pending'}>
              {pdf.status === 'pending' ? 'Generating PDF...' : pdf.status === 'done' ? 'PDF Saved!' : pdf.status === 'failed' ? 'Export Failed' : 'Export PDF'}
            </Button>
            <Button variant="ghost" size="sm" as="a" href={`/campaigns/${campaign.id}/sessions/${session.id}/edit`}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Delete "${session.title}"? This cannot be undone.`)) {
                  router.delete(`/campaigns/${campaign.id}/sessions/${session.id}`)
                }
              }}
              className="text-[var(--color-danger)] hover:border-[var(--color-danger)]"
            >
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 flex flex-col gap-5">

            {/* ── Recording ─────────────────────────────────────────── */}
            <Card>
               <CardHeader
                title="Session Recording"
                subtitle={liveAudioPath ? 'Audio saved' : 'No recording yet'}
                action={
                  liveAudioPath && (
                    <a
                      href={`/sessions/${session.id}/download-audio`}
                      className="inline-flex items-center gap-1.5 text-xs text-[var(--color-rune)] hover:text-[var(--color-rune-bright)] font-mono tracking-wider transition-colors"
                      download
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 3v13M5 16l7 7 7-7" />
                        <path d="M3 21h18" />
                      </svg>
                      Download
                    </a>
                  )
                }
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                  </svg>
                }
              />

              <div className="flex items-center gap-3 flex-wrap">
                {!isRecording ? (
                  <Button variant="rune" onClick={handleStartRecording} size="sm" disabled={isUploading || isImporting || liveTranscriptionStatus === 'processing' || liveTranscriptionStatus === 'pending' || (activeSessionId !== null && activeSessionId !== session.id)}>
                    <div className="w-2 h-2 rounded-full bg-[var(--color-danger)]" />
                    {isUploading ? 'Saving…' : 'Start Recording'}
                  </Button>
                ) : (
                  <Button variant="danger" onClick={stopRecording} size="sm">
                    <div className="w-2 h-2 rounded bg-[var(--color-danger)] animate-pulse" />
                    Stop · {fmtTime(recordingSeconds)}
                  </Button>
                )}

                {/* Import audio file */}
                {!isRecording && !isUploading && liveTranscriptionStatus !== 'processing' && liveTranscriptionStatus !== 'pending' && (
                  <>
                    <input
                      ref={importFileRef}
                      type="file"
                      accept="audio/*,.webm,.ogg,.wav,.mp4,.m4a,.mp3,.flac"
                      className="hidden"
                      onChange={handleImportAudio}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isImporting}
                      onClick={() => importFileRef.current?.click()}
                    >
                      {isImporting ? 'Importing…' : 'Import Audio File'}
                    </Button>
                  </>
                )}

                {isUploading && uploadProgress && (
                  <span className="text-xs text-[var(--color-text-dim)] font-mono animate-pulse">
                    {uploadProgress}
                  </span>
                )}

                {/* Manual re-transcribe fallback — only show when audio exists and not currently transcribing */}
                {liveAudioPath && !isRecording && !isUploading &&
                  liveTranscriptionStatus !== 'pending' &&
                  liveTranscriptionStatus !== 'processing' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLiveTranscriptionStatus('pending')
                      startTranscriptionPolling()
                      router.post(`/sessions/${session.id}/transcribe`, {}, { preserveScroll: true })
                    }}
                  >
                    {liveTranscriptionStatus === 'done' ? 'Re-transcribe' : 'Transcribe with WhisperX'}
                  </Button>
                )}
              </div>

              {isRecording && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 rounded-full bg-[var(--color-danger)] animate-pulse"
                        style={{ height: `${4 + Math.random() * 16}px`, animationDelay: `${i * 50}ms` }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-[var(--color-danger)] font-mono">{fmtTime(recordingSeconds)}</span>
                </div>
              )}

              {/* Transcription in-progress indicator */}
              {(liveTranscriptionStatus === 'pending' || liveTranscriptionStatus === 'processing') && (
                <TranscribingLoading
                  status={liveTranscriptionStatus}
                  progress={transcriptionProgress}
                  onCancel={handleCancelTranscription}
                />
              )}

              {liveTranscriptionStatus === 'failed' && (
                <p className="mt-3 text-xs text-[var(--color-danger)] italic">
                  Transcription failed. Check the queue log and try again.
                </p>
              )}
            </Card>

            {/* ── Bardic Summary ───────────────────────────────────── */}
            <Card>
              <CardHeader
                title="Bardic Summary"
                subtitle="AI-generated epic prose"
                action={
                  (liveHasTranscript || session.transcript_path) && !generatingSummary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={generateSummary}
                    >
                      {liveSummary ? 'Regenerate' : 'Generate'}
                    </Button>
                  )
                }
              />

              {generatingSummary ? (
                <BardicLoading />
              ) : summaryError ? (
                <p className="text-xs text-[var(--color-danger)] italic">
                  Summary generation failed. Check the queue log and try again.
                </p>
              ) : liveSummary ? (
                <div className="bardic-summary">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="font-heading text-base uppercase tracking-widest text-[var(--color-rune)] mt-5 mb-2 first:mt-0">
                          {children}
                        </h2>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-[var(--color-text-base)] leading-relaxed mb-3 last:mb-0 italic" style={{ fontFamily: 'var(--font-heading)' }}>
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-[var(--color-text-white)] font-semibold not-italic">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {liveSummary}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-dim)] italic">
                  {session.transcript_path
                    ? 'Click Generate to produce a bardic chronicle of this session.'
                    : 'Transcribe this session first to enable bardic summary generation.'
                  }
                </p>
              )}
            </Card>

            {/* ── Session Notes ────────────────────────────────────── */}
            {liveSessionNotes && (
              <Card>
                <CardHeader
                  title="Session Notes"
                  subtitle="Concise mechanical recap"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path d="M9 12h6M9 16h4" />
                    </svg>
                  }
                />
                <div className="session-notes">
                  <ReactMarkdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="font-heading text-xs uppercase tracking-widest text-[var(--color-text-dim)] mt-4 mb-1.5 first:mt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="font-heading text-xs uppercase tracking-wider text-[var(--color-text-dim)] mt-3 mb-1 first:mt-0">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-[var(--color-text-base)] leading-relaxed mb-2 last:mb-0">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc list-inside mb-2 flex flex-col gap-0.5">
                          {children}
                        </ul>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-[var(--color-text-base)] leading-relaxed">
                          {children}
                        </li>
                      ),
                      strong: ({ children }) => (
                        <strong className="text-[var(--color-text-white)] font-semibold">
                          {children}
                        </strong>
                      ),
                    }}
                  >
                    {liveSessionNotes}
                  </ReactMarkdown>
                </div>
              </Card>
            )}

            {/* ── Speaker Identification ───────────────────────────── */}
            {transcriptSegments && transcriptSegments.length > 0 && (() => {
              // Collect unique raw SPEAKER_XX labels that have no resolved profile
              const resolvedLabels = new Set(speakerProfiles.map(p => p.speaker_label))
              const unresolved = Array.from(
                new Set(
                  transcriptSegments
                    .map(s => s.speaker_label)
                    .filter((l): l is string => !!l && /^SPEAKER_\d+$/.test(l) && !resolvedLabels.has(l))
                )
              ).sort()
              return unresolved.length > 0 ? (
                <SpeakerIdentificationPanel
                  unresolvedLabels={unresolved}
                  transcriptSegments={transcriptSegments}
                  characters={characters}
                  sessionId={session.id}
                />
              ) : null
            })()}

            {/* ── Transcript ──────────────────────────────────────── */}
            {transcriptSegments && transcriptSegments.length > 0 && (
              <Card>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTranscriptOpen(o => !o)}
                    className="flex-1 text-left"
                  >
                    <CardHeader
                      title="Transcript"
                      subtitle={`${transcriptSegments.length} segments`}
                      icon={
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                        </svg>
                      }
                      action={
                        <svg
                          width="14" height="14"
                          viewBox="0 0 24 24"
                          fill="none" stroke="currentColor" strokeWidth="2"
                          className="transition-transform duration-200 text-[var(--color-text-dim)]"
                          style={{ transform: transcriptOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      }
                    />
                  </button>
                  {speakerProfiles.length > 0 && (
                    <button
                      type="button"
                      className="no-drag shrink-0 px-2 py-0.5 text-[10px] font-heading tracking-widest uppercase border border-[var(--color-rune-dim)] rounded text-[var(--color-text-dim)] hover:text-[var(--color-rune)] hover:border-[var(--color-rune)] transition-colors"
                      onClick={() => {
                        if (!confirm('Clear all speaker assignments for this session?')) return
                        router.delete(`/sessions/${session.id}/speakers`, {
                          preserveScroll: true,
                        })
                      }}
                    >
                      Reassign Speakers
                    </button>
                  )}
                </div>

                {transcriptOpen && (
                  <div className="mt-3 flex flex-col gap-0 pr-1">
                    {/* No speaker labels at all — diarization was not run */}
                    {transcriptSegments.every(s => !s.speaker_label) && (
                      <p className="text-[10px] text-[var(--color-text-dim)] italic mb-2">
                        No speaker labels — diarization was not run for this recording.
                      </p>
                    )}
                    <div className="max-h-96 overflow-y-auto flex flex-col gap-0">
                      {transcriptSegments.map((seg, i) => (
                        <div
                          key={i}
                          className="flex gap-3 py-1.5 border-b border-[var(--color-border)] last:border-0"
                        >
                          {/* Timestamp */}
                          <span className="text-[10px] font-mono text-[var(--color-rune)] shrink-0 pt-0.5 w-14">
                            {fmtTime(Math.floor(seg.start))}
                          </span>

                          {/* Speaker name */}
                          <span
                            className={`text-[10px] font-heading shrink-0 pt-0.5 w-24 truncate ${
                              seg.speaker_is_dm
                                ? 'text-[var(--color-rune-bright)]'
                                : seg.speaker && seg.speaker !== seg.speaker_label
                                  ? 'text-[var(--color-arcane)]'
                                  : 'text-[var(--color-text-dim)] opacity-60'
                            }`}
                            title={seg.speaker_label ? `${seg.speaker_label}${seg.speaker && seg.speaker !== seg.speaker_label ? ` → ${seg.speaker}` : ' (unidentified)'}` : undefined}
                          >
                            {seg.speaker && seg.speaker !== seg.speaker_label
                              ? seg.speaker
                              : seg.speaker_label ?? '—'}
                          </span>

                          {/* Dialogue */}
                          <span className="text-xs text-[var(--color-text-base)] leading-relaxed">
                            {seg.text.trim()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* ── Encounters ──────────────────────────────────────── */}
            {session.encounters.length > 0 && (
              <div>
                <h2 className="font-heading text-xs uppercase tracking-widest text-[var(--color-text-dim)] mb-3">
                  Encounters ({session.encounters.length})
                </h2>
                {session.encounters.map(enc => (
                  <EncounterCard key={enc.id} encounter={enc} sessionId={session.id} />
                ))}
              </div>
            )}

            {/* ── Key Events ──────────────────────────────────────── */}
            {session.key_events && (
              <Card>
                <CardHeader
                  title="Key Events"
                  subtitle="Notable moments from this session"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                      <path d="M9 12h6M9 16h4" />
                    </svg>
                  }
                />
                <div className="text-sm text-[var(--color-text-base)] leading-relaxed whitespace-pre-wrap">
                  {session.key_events}
                </div>
              </Card>
            )}

            {/* ── Next Session Notes ───────────────────────────────── */}
            {session.next_session_notes && (
              <Card>
                <CardHeader
                  title="Next Session"
                  subtitle="Hooks & plans for the next session"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                    </svg>
                  }
                />
                <div className="text-sm text-[var(--color-text-base)] leading-relaxed whitespace-pre-wrap">
                  {session.next_session_notes}
                </div>
              </Card>
            )}
          </div>

          {/* ── Right sidebar ──────────────────────────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Participating Characters */}
            {(() => {
              const participants = characters.filter(c =>
                session.participant_character_ids?.includes(c.id)
              )
              return participants.length > 0 ? (
                <Card>
                  <CardHeader
                    title="Party"
                    subtitle={`${participants.length} character${participants.length !== 1 ? 's' : ''}`}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                      </svg>
                    }
                  />
                  <div className="flex flex-col gap-2">
                    {participants.map(c => (
                      <a
                        key={c.id}
                        href={c.campaign_id ? `/campaigns/${c.campaign_id}/characters/${c.id}` : `/characters/${c.id}`}
                        className="flex items-center justify-between runic-card p-2 hover:border-[var(--color-rune)] transition-colors"
                      >
                        <span className="text-xs font-heading text-[var(--color-text-white)] tracking-wide">{c.name}</span>
                        <span className="text-[10px] text-[var(--color-text-dim)]">
                          {c.class} {c.level}
                        </span>
                      </a>
                    ))}
                  </div>
                </Card>
              ) : null
            })()}

            {/* Art Prompts */}
            <Card>
              <CardHeader
                title="Scene Art"
                subtitle="AI-generated prompts"
                action={
                  (liveHasTranscript || session.transcript_path || session.summary) && !generatingArtPrompts && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setGeneratingArtPrompts(true)
                        setArtPromptsError(false)
                        setLiveSceneArtPrompts([])
                        fetch(`/sessions/${session.id}/generate-art-prompts`, {
                          method: 'POST',
                          headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
                        })
                        startArtPromptsPolling()
                      }}
                    >
                      {liveSceneArtPrompts.length > 0 ? 'Regenerate' : 'Generate'}
                    </Button>
                  )
                }
              />
              {generatingArtPrompts ? (
                <div className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3 text-[var(--color-text-dim)]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune)" strokeWidth="2" className="animate-spin shrink-0">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                      <path d="M21 12a9 9 0 00-9-9" />
                    </svg>
                    <span className="text-xs">Generating scene prompts…</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelArtPrompts}
                    className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : artPromptsError ? (
                <p className="text-xs text-red-400 italic">Scene prompt generation failed. Try again.</p>
              ) : liveSceneArtPrompts.length === 0 ? (
                <p className="text-xs text-[var(--color-text-dim)] italic">No scenes generated yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {liveSceneArtPrompts.map(scene => (
                    <SceneCard key={scene.id} scene={scene} imageGenProvider={imageGenProvider} />
                  ))}
                </div>
              )}
            </Card>

            {/* Extract Session Details */}
            {session.transcript_path && (
              <Card>
                <CardHeader
                  title="Extract Details"
                  subtitle="Update characters & NPCs from transcript"
                  action={
                    extractionStatus !== 'generating' && (
                      <Button variant="ghost" size="sm" onClick={handleExtractDetails}>
                        {extractionStatus === 'done' ? 'Re-extract' : 'Extract'}
                      </Button>
                    )
                  }
                />
                {extractionStatus === 'generating' ? (
                  <div className="flex items-center gap-3 py-3 text-[var(--color-text-dim)]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune)" strokeWidth="2" className="animate-spin shrink-0">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                      <path d="M21 12a9 9 0 00-9-9" />
                    </svg>
                    <span className="text-xs">Extracting character updates and NPCs…</span>
                  </div>
                ) : extractionStatus === 'done' ? (
                  <p className="text-xs text-[var(--color-arcane)]">
                    Extraction complete. Check Characters and NPCs for updates.
                  </p>
                ) : extractionStatus === 'failed' ? (
                  <p className="text-xs text-red-400 italic">Extraction failed. Try again.</p>
                ) : (
                  <p className="text-xs text-[var(--color-text-dim)] italic">
                    Run extraction to update HP, gold, XP, and NPC records from this session's transcript.
                  </p>
                )}
              </Card>
            )}

            {/* DM Notes */}
            <Card>
              <CardHeader title="DM Notes" />
              <p className="text-xs text-[var(--color-text-base)] leading-relaxed whitespace-pre-wrap">
                {session.dm_notes ?? <span className="text-[var(--color-text-dim)] italic">No notes.</span>}
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>

    {/* Re-record confirmation modal */}
    {showRerecordConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div
          className="w-full max-w-sm mx-4 rounded border border-[var(--color-border)] p-6 flex flex-col gap-4"
          style={{ background: 'var(--color-bg)' }}
        >
          <h2 className="font-heading text-lg text-[var(--color-text-white)] tracking-widest uppercase">
            Replace Recording?
          </h2>
          <p className="text-sm text-[var(--color-text-dim)]">
            This session already has a recording. Starting a new one will overwrite it and clear any existing transcription. This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowRerecordConfirm(false)}
              className="px-4 py-2 text-xs font-heading tracking-widest uppercase border border-[var(--color-border)] rounded text-[var(--color-text-dim)] hover:border-[var(--color-rune)] hover:text-[var(--color-rune)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmRerecord}
              className="px-4 py-2 text-xs font-heading tracking-widest uppercase border border-[var(--color-danger)] rounded text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 transition-colors"
            >
              Yes, Re-record
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function EncounterCard({ encounter, sessionId }: { encounter: Encounter; sessionId: number }) {
  const [expanded, setExpanded] = useState(false)

  const fmtSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const handleDelete = () => {
    if (!confirm(`Delete encounter "${encounter.name ?? 'Unnamed Encounter'}"? This cannot be undone.`)) return
    router.delete(`/encounters/${encounter.id}`)
  }

  // Group turns by round
  const rounds = (encounter.turns ?? []).reduce<Record<number, EncounterTurn[]>>((acc, t) => {
    ;(acc[t.round_number] ??= []).push(t)
    return acc
  }, {})
  const roundNums = Object.keys(rounds).map(Number).sort((a, b) => a - b)

  const actorColor = (type: string) =>
    type === 'monster' ? 'text-[var(--color-ember)]' :
    type === 'npc'     ? 'text-[var(--color-arcane)]' :
                         'text-[var(--color-rune-bright)]'

  return (
    <div className="runic-card p-3 mb-2">
      {/* Header row — always visible */}
      <div className="flex items-center gap-2">
        <button onClick={() => setExpanded(o => !o)} className="flex-1 text-left min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-heading text-sm text-[var(--color-text-white)] truncate">
              {encounter.name ?? 'Unnamed Encounter'}
            </span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <Badge variant={encounter.status === 'confirmed' ? 'success' : encounter.status === 'dismissed' ? 'muted' : 'warning'}>
                {encounter.status.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-[var(--color-text-dim)]">{encounter.round_count} rounds</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                className="text-[var(--color-text-dim)] transition-transform duration-150 shrink-0"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

        {/* Timestamp range — always visible if present */}
        {(encounter.transcript_start_second != null || encounter.transcript_end_second != null) && (
          <p className="text-[10px] text-[var(--color-text-dim)] mt-0.5 font-mono">
            {encounter.transcript_start_second != null ? fmtSec(encounter.transcript_start_second) : '?'}
            {' — '}
            {encounter.transcript_end_second != null ? fmtSec(encounter.transcript_end_second) : '?'}
          </p>
        )}
        </button>
        {/* Delete button — outside the expand button so it doesn't toggle expand */}
        <button
          type="button"
          onClick={handleDelete}
          className="shrink-0 p-1 text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
          title="Delete encounter"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>

      {/* Expanded: turn-by-turn breakdown */}
      {expanded && encounter.turns && encounter.turns.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-t border-[var(--color-border)] pt-3">
          {roundNums.map(rn => (
            <div key={rn}>
              <p className="text-[10px] font-heading uppercase tracking-widest text-[var(--color-text-dim)] mb-1">
                Round {rn}
              </p>
              <div className="flex flex-col gap-1">
                {rounds[rn]
                  .sort((a, b) => a.turn_order - b.turn_order)
                  .map(turn => (
                    <div key={turn.id} className="flex gap-2 items-start text-[10px]">
                      {/* Actor */}
                      <span className={`font-heading shrink-0 w-28 truncate ${actorColor(turn.actor_type)}`}>
                        {turn.actor_name}
                      </span>

                      {/* Action type badge */}
                      {turn.action_type && (
                        <span className="shrink-0 px-1 rounded border border-[var(--color-border)] text-[var(--color-text-dim)] uppercase tracking-wider">
                          {turn.action_type}
                        </span>
                      )}

                      {/* Description */}
                      {turn.action_description && (
                        <span className="text-[var(--color-text-base)] leading-relaxed flex-1">
                          {turn.action_description}
                          {turn.target_name && (
                            <span className="text-[var(--color-text-dim)]"> → {turn.target_name}</span>
                          )}
                        </span>
                      )}

                      {/* Damage / healing / crit */}
                      <div className="shrink-0 flex items-center gap-1 ml-auto">
                        {turn.damage_dealt != null && turn.damage_dealt > 0 && (
                          <span className="text-[var(--color-ember)]">
                            -{turn.damage_dealt}hp{turn.is_critical ? ' ✦' : ''}
                          </span>
                        )}
                        {turn.healing_done != null && turn.healing_done > 0 && (
                          <span className="text-[var(--color-arcane)]">+{turn.healing_done}hp</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {expanded && (!encounter.turns || encounter.turns.length === 0) && (
        <p className="text-[10px] text-[var(--color-text-dim)] italic mt-2">No turns recorded.</p>
      )}
    </div>
  )
}

function BardicLoading() {
  const lines = [70, 90, 55, 85, 65, 80, 40]
  return (
    <div className="flex flex-col gap-3 py-1 animate-pulse">
      {/* Quill icon */}
      <div className="flex items-center gap-2 mb-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune)" strokeWidth="1.5" className="shrink-0">
          <path d="M20 2c0 0-8 2-12 10s-2 10-2 10l4-2 2 4c0 0 2-4 4-6s8-4 8-4" />
          <path d="M6 18l2-2" />
        </svg>
        <span className="text-xs font-heading tracking-widest text-[var(--color-rune)]">
          The bard is writing… (bardic summary + session notes)
        </span>
      </div>
      {/* Shimmer lines */}
      {lines.map((w, i) => (
        <div
          key={i}
          className="h-2.5 rounded-full bg-[var(--color-border)]"
          style={{ width: `${w}%`, opacity: 0.4 + (i % 3) * 0.2 }}
        />
      ))}
    </div>
  )
}

function TranscribingLoading({
  status,
  progress,
  onCancel,
}: {
  status: 'pending' | 'processing'
  progress: { stage: string; percent: number } | null
  onCancel: () => void
}) {
  const isPending = status === 'pending'
  const percent   = progress?.percent ?? (isPending ? 0 : null)
  const stage     = progress?.stage   ?? (isPending ? 'Queued for transcription…' : 'WhisperX transcribing…')

  return (
    <div className="mt-3 flex flex-col gap-2">
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-arcane)" strokeWidth="1.5"
            className={`shrink-0 ${isPending ? 'animate-pulse' : ''}`}
          >
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="text-xs font-heading tracking-widest text-[var(--color-arcane)]">
            {stage}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {percent !== null && (
            <span className="text-xs font-mono text-[var(--color-text-dim)] tabular-nums">
              {percent}%
            </span>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-[var(--color-text-dim)] hover:text-[var(--color-danger)] transition-colors"
            title="Cancel transcription"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
        {percent !== null ? (
          <div
            className="h-full rounded-full bg-[var(--color-arcane)] transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        ) : (
          /* Indeterminate stripe when no percent available */
          <div
            className="h-full w-1/3 rounded-full bg-[var(--color-arcane)] animate-[shimmer_1.4s_ease-in-out_infinite]"
            style={{
              background: `linear-gradient(90deg, transparent 0%, var(--color-arcane) 50%, transparent 100%)`,
              animation: 'shimmer 1.4s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </div>
  )
}

function SceneCard({ scene, imageGenProvider }: { scene: SceneArtPrompt; imageGenProvider: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const [liveStatus, setLiveStatus] = useState(scene.status)
  const [liveImagePath, setLiveImagePath] = useState(scene.image_path)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Inline prompt editing
  const [editPrompt, setEditPrompt] = useState(scene.prompt ?? '')
  const [editNegPrompt, setEditNegPrompt] = useState(scene.negative_prompt ?? '')
  const [savingPrompt, setSavingPrompt] = useState(false)
  const [savedPrompt, setSavedPrompt] = useState(false)
  const promptDirty = editPrompt !== (scene.prompt ?? '') || editNegPrompt !== (scene.negative_prompt ?? '')

  useEffect(() => {
    if (liveStatus !== 'generating') return
    pollRef.current = setInterval(async () => {
      const res = await fetch(`/scene-art-prompts/${scene.id}/image-status`)
      if (!res.ok) return
      const json = await res.json()
      setLiveStatus(json.status)
      if (json.status === 'image_ready' && json.image_path) {
        setLiveImagePath(json.image_path)
        clearInterval(pollRef.current!)
      } else if (json.status === 'generated') {
        clearInterval(pollRef.current!) // reverted to text-only (error)
      }
    }, 3000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [liveStatus])

  const handleGenerateImage = async () => {
    setLiveImagePath(null)
    setLiveStatus('generating' as typeof liveStatus)
    await fetch(`/scene-art-prompts/${scene.id}/generate-image`, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
    })
  }

  const handleCancelImage = async () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setLiveStatus('generated' as typeof liveStatus)
    await fetch(`/scene-art-prompts/${scene.id}/cancel-image`, {
      method: 'POST',
      headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
    })
  }

  const handleSavePrompt = async () => {
    setSavingPrompt(true)
    setSavedPrompt(false)
    await fetch(`/scene-art-prompts/${scene.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
      },
      body: JSON.stringify({ prompt: editPrompt, negative_prompt: editNegPrompt }),
    })
    setSavingPrompt(false)
    setSavedPrompt(true)
    setTimeout(() => setSavedPrompt(false), 2000)
  }

  return (
    <div className="runic-card p-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <p className="text-xs font-heading text-[var(--color-text-white)]">{scene.scene_title ?? 'Scene'}</p>
      </button>
      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {/* Generated image */}
          {liveImagePath && (
            <img
              src={`/storage-file/${liveImagePath}`}
              alt={scene.scene_title ?? 'Scene image'}
              className="w-full rounded border border-[var(--color-border)] object-cover max-h-64"
            />
          )}
          {/* Generating shimmer */}
          {liveStatus === 'generating' && !liveImagePath && (
            <div className="w-full h-32 rounded border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-rune)" strokeWidth="2" className="animate-spin">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.2" />
                  <path d="M21 12a9 9 0 00-9-9" />
                </svg>
                <span className="text-xs text-[var(--color-text-dim)]">Generating image…</span>
              </div>
              <button
                type="button"
                onClick={handleCancelImage}
                className="px-2 py-0.5 text-[10px] font-heading tracking-widest uppercase border border-[var(--color-ember)] rounded text-[var(--color-ember)] hover:bg-[var(--color-ember)]/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          {/* Editable prompt */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] font-heading">Prompt</label>
            <textarea
              value={editPrompt}
              onChange={e => setEditPrompt(e.target.value)}
              rows={3}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] text-[var(--color-text-base)] leading-relaxed resize-y focus:outline-none focus:border-[var(--color-rune)]"
            />
            <label className="text-[10px] uppercase tracking-widest text-[var(--color-text-dim)] font-heading mt-1">Negative Prompt</label>
            <textarea
              value={editNegPrompt}
              onChange={e => setEditNegPrompt(e.target.value)}
              rows={2}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] text-[var(--color-text-base)] leading-relaxed resize-y focus:outline-none focus:border-[var(--color-rune)]"
            />
            {(promptDirty || savedPrompt) && (
              <div className="flex items-center gap-2 mt-0.5">
                {promptDirty && (
                  <button
                    type="button"
                    onClick={handleSavePrompt}
                    disabled={savingPrompt}
                    className="px-2 py-0.5 text-[10px] font-heading tracking-widest uppercase border border-[var(--color-rune)] rounded text-[var(--color-rune)] hover:bg-[var(--color-rune)]/10 transition-colors disabled:opacity-50"
                  >
                    {savingPrompt ? 'Saving…' : 'Save Prompt'}
                  </button>
                )}
                {savedPrompt && (
                  <span className="text-[10px] text-[var(--color-arcane)]">Saved</span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="muted">{scene.art_style}</Badge>
            <Badge variant={liveStatus === 'image_ready' ? 'success' : liveStatus === 'generating' ? 'warning' : 'muted'}>
              {liveStatus}
            </Badge>
            {imageGenProvider && imageGenProvider !== 'none' && liveStatus !== 'generating' && (
              <button
                type="button"
                onClick={handleGenerateImage}
                className="px-2 py-0.5 text-[10px] font-heading tracking-widest uppercase border border-[var(--color-rune)] rounded text-[var(--color-rune)] hover:bg-[var(--color-rune)]/10 transition-colors"
              >
                {liveStatus === 'image_ready' ? 'Regenerate Image' : 'Generate Image'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
