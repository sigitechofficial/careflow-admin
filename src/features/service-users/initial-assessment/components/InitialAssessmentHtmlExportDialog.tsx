import * as React from 'react'
import { ExternalLink, FileDown, Loader2, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/form-field'
import {
  downloadHtmlBlob,
  fetchInitialAssessmentHtml,
} from '@/features/service-users/initial-assessment/api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  submission: InitialAssessmentSubmission | null | undefined
  canExportSecure?: boolean
}

export function InitialAssessmentHtmlExportDialog({
  open,
  onOpenChange,
  serviceUserId,
  submission,
  canExportSecure = false,
}: Props) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [html, setHtml] = React.useState<string | null>(null)
  const [filename, setFilename] = React.useState('initial-assessment.html')
  const [includeSecureFields, setIncludeSecureFields] = React.useState(false)

  const loadPreview = React.useCallback(
    async (signal?: AbortSignal) => {
      if (!submission?.id || !serviceUserId) return
      setLoading(true)
      setError(null)
      try {
        const result = await fetchInitialAssessmentHtml(serviceUserId, submission.id, {
          includeSecureFields: canExportSecure && includeSecureFields,
        }, { signal })
        setHtml(result.html)
        setFilename(result.filename)
      } catch (e) {
        if (signal?.aborted) return
        setHtml(null)
        setError(e instanceof Error ? e.message : 'Could not load preview')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [serviceUserId, submission?.id, canExportSecure, includeSecureFields],
  )

  React.useEffect(() => {
    if (!open) {
      setHtml(null)
      setError(null)
      return
    }
    const ac = new AbortController()
    void loadPreview(ac.signal)
    return () => ac.abort()
  }, [open, loadPreview])

  const onDownload = () => {
    if (!html) return
    downloadHtmlBlob(html, filename)
    toastSuccess('HTML downloaded', 'Assessment saved to your downloads folder.')
    onOpenChange(false)
  }

  const onOpenInTab = () => {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex max-h-[92vh] flex-col">
        <DialogHeader>
          <DialogTitle>Preview HTML export</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex min-h-0 flex-1 flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Review the full assessment below, then download or open in a new browser tab. Use your browser&apos;s
            print option to save as PDF if needed.
          </p>

          {canExportSecure ? (
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={includeSecureFields}
                onChange={(e) => setIncludeSecureFields(e.target.checked)}
                disabled={loading}
              />
              <span>
                <Label className="cursor-pointer font-medium">Include secure access fields</Label>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Door codes and key safe details are withheld unless enabled. Preview reloads when changed.
                </span>
              </span>
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">
              Secure access fields (door code, key safe) are withheld from this export.
            </p>
          )}

          <div className="relative min-h-[min(70vh,720px)] flex-1 overflow-hidden rounded-lg border border-border bg-muted/20">
            {loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
                Generating preview…
              </div>
            ) : null}
            {error && !loading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => void loadPreview()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : null}
            {html && !loading && !error ? (
              <iframe
                title="Initial assessment HTML preview"
                srcDoc={html}
                className="h-full min-h-[min(70vh,720px)] w-full bg-white"
                sandbox="allow-same-origin"
              />
            ) : null}
          </div>
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadPreview()}
            disabled={loading || !submission?.id}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={onOpenInTab} disabled={!html || loading}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in tab
          </Button>
          <Button type="button" onClick={onDownload} disabled={!html || loading}>
            <FileDown className="mr-2 h-4 w-4" />
            Download HTML
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
