/**
 * RecordingContext — global recording state that survives Inertia navigation.
 *
 * All MediaRecorder refs and chunk-upload state live here so they are never
 * destroyed when the user navigates away from the session Show page.
 *
 * Show.tsx calls the functions exposed by this context instead of owning the
 * recorder itself.  AppLayout reads `isRecording` to show the persistent
 * recording indicator and to block navigation while a session is in progress.
 */

import React, { createContext, useContext, useRef, useState, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecordingContextValue {
  /** True while the MediaRecorder is running (mic is live). */
  isRecording: boolean
  /** Elapsed seconds since recording started. */
  recordingSeconds: number
  /** True while the finalize POST is in-flight. */
  isUploading: boolean
  /** Human-readable upload progress message. */
  uploadProgress: string | null
  /** The session ID currently being recorded (null when idle). */
  activeSessionId: number | null
  /** The campaign ID for the active session (null when idle). */
  activeCampaignId: number | null
  /** URL to the live session overview page for the active session. */
  activeLiveUrl: string | null

  startRecording: (sessionId: number, campaignId: number, onFinalized: (audioPath: string | null) => void) => Promise<void>
  stopRecording: () => void
  /**
   * Re-register the onFinalized callback. Call this from Show.tsx on every
   * mount so the correct setState closures are always current, even if the
   * user navigated away and came back while recording was in flight.
   */
  registerOnFinalized: (sessionId: number, cb: (audioPath: string | null) => void) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const RecordingContext = createContext<RecordingContextValue | null>(null)

export function useRecording(): RecordingContextValue {
  const ctx = useContext(RecordingContext)
  if (!ctx) throw new Error('useRecording must be used inside <RecordingProvider>')
  return ctx
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function csrf(): string {
  return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? ''
}

const FLUSH_EVERY_CHUNKS = 10 // ~10 s at 1 s timeslice

// ── Provider ──────────────────────────────────────────────────────────────────

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  // ── Reactive state (shown in UI) ─────────────────────────────────────────
  const [isRecording, setIsRecording]       = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isUploading, setIsUploading]       = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [activeCampaignId, setActiveCampaignId] = useState<number | null>(null)

  // ── Stable refs (never cause re-renders, survive navigation) ─────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const uploadIdRef      = useRef<string | null>(null)
  const pendingChunksRef = useRef<Blob[]>([])
  const chunkIndexRef    = useRef<number>(0)
  const mimeTypeRef      = useRef<string>('audio/webm')
  const isFlushing       = useRef<boolean>(false)
  const sessionIdRef     = useRef<number | null>(null)
  const onFinalizedRef   = useRef<((audioPath: string | null) => void) | null>(null)

  // ── Chunk helpers ─────────────────────────────────────────────────────────

  const postChunk = useCallback(async (blob: Blob, index: number): Promise<boolean> => {
    const sid = sessionIdRef.current
    if (sid === null) return false
    const fd = new FormData()
    fd.append('upload_id',   uploadIdRef.current!)
    fd.append('chunk_index', String(index))
    fd.append('chunk',       blob, `chunk-${index}.part`)
    try {
      const res = await fetch(`/sessions/${sid}/record/chunk`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': csrf() },
        body: fd,
      })
      return res.ok
    } catch {
      return false
    }
  }, [])

  const flushPending = useCallback(async () => {
    if (isFlushing.current) return
    if (pendingChunksRef.current.length === 0) return
    isFlushing.current = true

    const toFlush = pendingChunksRef.current.splice(0)
    const blob    = new Blob(toFlush, { type: mimeTypeRef.current })
    const index   = chunkIndexRef.current++

    const ok = await postChunk(blob, index)
    if (!ok) {
      pendingChunksRef.current.unshift(...toFlush)
      console.warn(`Chunk ${index} upload failed — will retry on finalize`)
    }
    isFlushing.current = false
  }, [postChunk])

  // ── startRecording ────────────────────────────────────────────────────────

  const startRecording = useCallback(async (
    sessionId: number,
    campaignId: number,
    onFinalized: (audioPath: string | null) => void,
  ) => {
    if (isRecording) return // already recording

    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      mimeTypeRef.current = mimeType

      // 1. Init upload session on the server
      const initRes = await fetch(`/sessions/${sessionId}/record/init`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': csrf() },
      })
      if (!initRes.ok) {
        stream.getTracks().forEach(t => t.stop())
        alert('Failed to initialise recording session.')
        return
      }
      const { upload_id } = await initRes.json()

      // Reset all refs
      sessionIdRef.current     = sessionId
      onFinalizedRef.current   = onFinalized
      uploadIdRef.current      = upload_id
      pendingChunksRef.current = []
      chunkIndexRef.current    = 0
      isFlushing.current       = false

      // 2. Start MediaRecorder with 1 s timeslice
      const mr = new MediaRecorder(stream, { mimeType })
      mr.ondataavailable = async (e: BlobEvent) => {
        if (!e.data || e.data.size === 0) return
        pendingChunksRef.current.push(e.data)
        if (pendingChunksRef.current.length >= FLUSH_EVERY_CHUNKS) {
          await flushPending()
        }
      }
      mr.start(1000)
      mediaRecorderRef.current = mr

      setActiveSessionId(sessionId)
      setActiveCampaignId(campaignId)
      setIsRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert('Could not access microphone. Please grant audio permissions.')
    }
  }, [isRecording, flushPending])

  // ── stopRecording ─────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return
    const mr  = mediaRecorderRef.current
    const sid = sessionIdRef.current!

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsRecording(false)

    mr.onstop = async () => {
      // Stop mic tracks immediately so the OS recording indicator goes away
      mr.stream.getTracks().forEach(t => t.stop())
      mediaRecorderRef.current = null

      setIsUploading(true)
      setUploadProgress('Flushing remaining audio…')

      try {
        await flushPending()
        // Wait for any concurrent flush to settle
        while (isFlushing.current) {
          await new Promise(r => setTimeout(r, 100))
        }

        const totalChunks = chunkIndexRef.current
        setUploadProgress(`Finalising ${totalChunks} chunk${totalChunks !== 1 ? 's' : ''}…`)

        const fd = new FormData()
        fd.append('upload_id',    uploadIdRef.current!)
        fd.append('total_chunks', String(totalChunks))
        fd.append('mime_type',    mimeTypeRef.current)

        const res = await fetch(`/sessions/${sid}/record/finalize`, {
          method: 'POST',
          headers: { 'X-CSRF-TOKEN': csrf() },
          body: fd,
        })

        setIsUploading(false)
        setUploadProgress(null)
        setActiveSessionId(null)
        setActiveCampaignId(null)

        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          onFinalizedRef.current?.(data.audio_path ?? null)
        } else {
          const err = await res.json().catch(() => ({}))
          onFinalizedRef.current?.(null)
          alert('Failed to finalise recording: ' + (err.error ?? res.statusText))
        }
      } catch (e) {
        setIsUploading(false)
        setUploadProgress(null)
        setActiveSessionId(null)
        setActiveCampaignId(null)
        onFinalizedRef.current?.(null)
        console.error('Finalise error', e)
      }

      // Reset refs
      uploadIdRef.current    = null
      sessionIdRef.current   = null
      onFinalizedRef.current = null
    }

    mr.stop()
  }, [flushPending])

  // ── registerOnFinalized ───────────────────────────────────────────────────
  // Allows Show.tsx to refresh the callback on every mount so the correct
  // React state setters are always current.

  const registerOnFinalized = useCallback((sessionId: number, cb: (audioPath: string | null) => void) => {
    if (sessionIdRef.current === sessionId) {
      onFinalizedRef.current = cb
    }
  }, [])

  // ── Context value ─────────────────────────────────────────────────────────

  const value: RecordingContextValue = {
    isRecording,
    recordingSeconds,
    isUploading,
    uploadProgress,
    activeSessionId,
    activeCampaignId,
    activeLiveUrl: activeSessionId && activeCampaignId
      ? `/campaigns/${activeCampaignId}/sessions/${activeSessionId}/live`
      : null,
    startRecording,
    stopRecording,
    registerOnFinalized,
  }

  return (
    <RecordingContext.Provider value={value}>
      {children}
    </RecordingContext.Provider>
  )
}
