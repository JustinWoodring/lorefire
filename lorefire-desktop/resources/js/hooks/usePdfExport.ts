import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

type PdfStatus = 'idle' | 'pending' | 'done' | 'failed'

export function usePdfExport(exportUrl: string) {
  const [status, setStatus] = useState<PdfStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => () => stopPolling(), [])

  const trigger = async () => {
    if (status === 'pending') return
    setStatus('pending')
    setError(null)

    try {
      const { data } = await axios.post(exportUrl, {}, {
        headers: { 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
      })
      const key: string = data.key

      pollRef.current = setInterval(async () => {
        try {
          const { data: poll } = await axios.get(`/pdf-export/status?key=${encodeURIComponent(key)}`)
          if (poll.status === 'done') {
            stopPolling()
            setStatus('done')
            // Reset to idle after 3s so the button returns to normal
            setTimeout(() => setStatus('idle'), 3000)
          } else if (poll.status === 'failed') {
            stopPolling()
            setError(poll.error ?? 'PDF generation failed')
            setStatus('failed')
            setTimeout(() => setStatus('idle'), 5000)
          }
        } catch {
          // network hiccup — keep polling
        }
      }, 2000)
    } catch (e: any) {
      setStatus('failed')
      setError('Failed to start PDF export')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  return { status, error, trigger }
}
