import * as React from 'react'
import { AlertCircle, Copy, Download, FileAudio, Loader2, Mic, RotateCcw, Square, Upload } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import {
  useInitialAssessmentTranscription,
  useStartInitialAssessmentTranscription,
} from '@/features/service-users/initial-assessment/hooks/useInitialAssessmentEnterprise'
import { initialAssessmentKeys } from '@/features/service-users/initial-assessment/keys'
import {
  InitialAssessmentAiFillReview,
  type AiFillTarget,
} from '@/features/service-users/initial-assessment/components/InitialAssessmentAiFillReview'

type Props = {
  serviceUserId: string
  submissionId: string | null
  canUpdate: boolean
  /** The open form tab, so the transcript can fill its fields. */
  fillTarget?: AiFillTarget
}

const AUDIO_ACCEPT = 'audio/*,.mp3,.m4a,.wav,.webm,.ogg,.opus,.aac,.flac,.amr,.3gp'

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, '0')
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

const jobStorageKey = (submissionId: string) => `ia-transcription:${submissionId}`

function readStoredJob(submissionId: string | null) {
  if (!submissionId) return null
  try {
    return window.sessionStorage.getItem(jobStorageKey(submissionId))
  } catch {
    return null
  }
}

function storeJob(submissionId: string, jobId: string | null) {
  try {
    if (jobId) window.sessionStorage.setItem(jobStorageKey(submissionId), jobId)
    else window.sessionStorage.removeItem(jobStorageKey(submissionId))
  } catch {
    /* storage unavailable: the job is simply not remembered across tabs */
  }
}

function pickRecorderType() {
  if (typeof MediaRecorder === 'undefined') return null
  for (const type of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

/**
 * Conversation to text: record the assessment here (microphone) or upload a recording, and
 * Whisper on the CareFlow server turns the speech into text. The recording and Whisper's transcript
 * are kept in the assessment's attachments (so on the service user's record); edits made in the box
 * here are not saved back — copy what you need into the answers.
 */
export function InitialAssessmentTranscriptionPanel({ serviceUserId, submissionId, canUpdate, fillTarget }: Props) {
  const [jobId, setJobId] = React.useState<string | null>(() => readStoredJob(submissionId))
  const [recording, setRecording] = React.useState(false)
  const [elapsed, setElapsed] = React.useState(0)
  const [micError, setMicError] = React.useState<string | null>(null)
  const [lastAudio, setLastAudio] = React.useState<{ blob: Blob; name: string } | null>(null)
  const [text, setText] = React.useState('')
  const recorderRef = React.useRef<MediaRecorder | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const chunksRef = React.useRef<Blob[]>([])
  const timerRef = React.useRef<number | null>(null)
  const discardRef = React.useRef(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const start = useStartInitialAssessmentTranscription(serviceUserId, submissionId ?? '')
  const jobQuery = useInitialAssessmentTranscription(serviceUserId, submissionId ?? '', jobId)
  const job = jobQuery.data

  React.useEffect(() => {
    setJobId(readStoredJob(submissionId))
  }, [submissionId])

  React.useEffect(() => {
    if (job?.status === 'DONE') setText(job.text ?? '')
  }, [job?.status, job?.text])

  // The transcript is saved as an attachment just after Whisper finishes; refresh the list then.
  const queryClient = useQueryClient()
  React.useEffect(() => {
    if (job?.status !== 'DONE' || !submissionId) return
    const refresh = () =>
      void queryClient.invalidateQueries({ queryKey: initialAssessmentKeys.attachments(serviceUserId, submissionId) })
    refresh()
    const t = window.setTimeout(refresh, 2000)
    return () => window.clearTimeout(t)
  }, [job?.status, queryClient, serviceUserId, submissionId])

  const stopTracks = React.useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  React.useEffect(
    () => () => {
      discardRef.current = true
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      stopTracks()
    },
    [stopTracks],
  )

  const transcribe = (blob: Blob, name: string) => {
    if (!submissionId) return
    setLastAudio({ blob, name })
    setText('')
    start.mutate(
      { file: blob, fileName: name },
      {
        onSuccess: (created) => {
          setJobId(created.id)
          storeJob(submissionId, created.id)
        },
        onError: (e) => toastApiError(e, 'Could not upload the recording'),
      },
    )
  }

  const startRecording = async () => {
    setMicError(null)
    const type = pickRecorderType()
    if (type === null || !navigator.mediaDevices?.getUserMedia) {
      setMicError('This browser cannot record audio here. Recording needs Chrome, Edge, Firefox or Safari over HTTPS (or localhost).')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
      chunksRef.current = []
      discardRef.current = false
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stopTracks()
        setRecording(false)
        if (discardRef.current) return
        const mime = recorder.mimeType || type || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mime })
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
        const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')
        transcribe(blob, `assessment-recording-${stamp}.${ext}`)
      }
      recorderRef.current = recorder
      recorder.start(1000)
      setRecording(true)
      setElapsed(0)
      const startedAt = Date.now()
      timerRef.current = window.setInterval(() => setElapsed((Date.now() - startedAt) / 1000), 500)
    } catch (e) {
      stopTracks()
      const name = e instanceof DOMException ? e.name : ''
      setMicError(
        name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow the microphone for this site in the browser address bar, then try again.'
          : name === 'NotFoundError'
            ? 'No microphone was found on this device.'
            : 'Could not start the microphone.',
      )
    }
  }

  const stopRecording = (discard: boolean) => {
    discardRef.current = discard
    recorderRef.current?.stop()
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) transcribe(file, file.name)
  }

  const reset = () => {
    setJobId(null)
    setText('')
    setLastAudio(null)
    if (submissionId) storeJob(submissionId, null)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      toastSuccess('Transcript copied')
    } catch (e) {
      toastApiError(e, 'Could not copy')
    }
  }

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!canUpdate || !submissionId) return null

  const busy = start.isPending || job?.status === 'QUEUED' || job?.status === 'RUNNING'
  const failed = job?.status === 'FAILED' || (jobId && jobQuery.isError)
  const percent = job?.duration ? Math.min(100, Math.round((job.done / job.duration) * 100)) : 0

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm" data-testid="ia-transcription-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">Conversation to text</h3>
            <p className="text-xs text-muted-foreground">
              Record the assessment conversation or upload a recording. It is turned into text on the CareFlow server, and the recording and its transcript are saved to this assessment's attachments.
            </p>
          </div>
        </div>
        {!recording && !busy ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void startRecording()}>
              <Mic className="mr-1 h-4 w-4" />
              Record here
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" />
              Upload recording
            </Button>
            <input ref={fileRef} type="file" accept={AUDIO_ACCEPT} className="hidden" onChange={onPickFile} data-testid="ia-transcription-file" />
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 px-4 py-3 text-sm">
        {micError ? (
          <p className="flex items-start gap-2 text-red-700 dark:text-red-300" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {micError}
          </p>
        ) : null}

        {recording ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <span className="font-medium text-red-800 dark:text-red-200">Recording</span>
            <span className="font-mono tabular-nums">{clock(elapsed)}</span>
            <div className="ml-auto flex gap-2">
              <Button type="button" size="sm" onClick={() => stopRecording(false)}>
                <Square className="mr-1 h-3.5 w-3.5" />
                Stop &amp; transcribe
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => stopRecording(true)}>
                Discard
              </Button>
            </div>
          </div>
        ) : null}

        {busy ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span>
                {start.isPending
                  ? 'Uploading the recording…'
                  : job?.status === 'QUEUED'
                    ? `Waiting to start${job.position > 1 ? ` (position ${job.position} in the queue)` : ''}…`
                    : job?.duration
                      ? `Converting speech to text… ${clock(job.done)} of ${clock(job.duration)} (${percent}%)`
                      : 'Preparing Whisper…'}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${start.isPending ? 5 : Math.max(5, percent)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">You can keep working on the assessment while this runs. A one-hour recording can take a while.</p>
          </div>
        ) : null}

        {failed && !busy ? (
          <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950/30" role="alert">
            <p className="flex items-start gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {job?.error ?? 'This transcription is no longer available. Upload the recording again.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {lastAudio ? (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => transcribe(lastAudio.blob, lastAudio.name)}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    Try again
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => download(lastAudio.blob, lastAudio.name)}>
                    <FileAudio className="mr-1 h-4 w-4" />
                    Save recording
                  </Button>
                </>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={reset}>
                Clear
              </Button>
            </div>
          </div>
        ) : null}

        {job?.status === 'DONE' ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {job.fileName} · {clock(job.duration ?? 0)}
                {job.language ? ` · language: ${job.language}` : ''} · check and correct before using it
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void copy()} disabled={!text}>
                  <Copy className="mr-1 h-4 w-4" />
                  Copy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!text}
                  onClick={() => download(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${job.fileName.replace(/\.[^.]+$/, '')}-transcript.txt`)}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Download .txt
                </Button>
                {lastAudio ? (
                  <Button type="button" size="sm" variant="ghost" onClick={() => download(lastAudio.blob, lastAudio.name)}>
                    <FileAudio className="mr-1 h-4 w-4" />
                    Save recording
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" onClick={reset}>
                  Clear
                </Button>
              </div>
            </div>
            {text || job.text ? (
              <textarea
                aria-label="Transcript"
                className="min-h-48 w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
                value={text}
                onChange={(e) => setText(e.target.value)}
                data-testid="ia-transcript"
              />
            ) : (
              <p className="text-muted-foreground">No speech was found in this recording.</p>
            )}
            {fillTarget && text.trim() ? (
              <InitialAssessmentAiFillReview
                serviceUserId={serviceUserId}
                submissionId={submissionId}
                transcript={text}
                target={fillTarget}
              />
            ) : null}
          </div>
        ) : null}

        {!recording && !busy && !failed && job?.status !== 'DONE' && !micError ? (
          <p className="text-xs text-muted-foreground">
            Ask the service user (or their representative) for permission before recording. Supported uploads: MP3, M4A, WAV, WebM, OGG, AAC, FLAC (up to 200 MB).
          </p>
        ) : null}
      </div>
    </div>
  )
}
