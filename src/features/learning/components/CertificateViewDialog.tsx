import * as React from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { fetchLearningCertificatePdfLink } from '@/features/learning/api/learning.api'
import type { LearningCertificate } from '@/features/learning/types/learning.types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  certificate: Pick<LearningCertificate, 'id'> & Partial<Pick<LearningCertificate, 'assignmentId' | 'issueNotes'>> | null
}

/**
 * The certificate PDF made by the API — the same document the carer sees in the app
 * (17 Nov 2026, first design — to be finalised).
 */
export function CertificateViewDialog({ open, onOpenChange, certificate }: Props) {
  const [url, setUrl] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const id = certificate?.id

  React.useEffect(() => {
    if (!open || !id) return
    let live = true
    setUrl(null)
    setError(null)
    fetchLearningCertificatePdfLink(id)
      .then(res => {
        if (live) setUrl(/^https?:\/\//i.test(res.url) ? res.url : `${getApiBaseUrl()}${res.url}`)
      })
      .catch(() => {
        if (live) setError('The certificate could not be loaded.')
      })
    return () => {
      live = false
    }
  }, [open, id])

  if (!certificate) return null
  const manual = certificate.assignmentId === null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className="flex h-[96dvh] max-h-[96dvh] w-[98vw] max-w-[1400px] flex-col gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 !py-2.5">
          <DialogTitle>Certificate</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex min-h-0 flex-1 items-center justify-center bg-slate-100 !p-2 sm:!p-3">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : !url ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <iframe
              title="Certificate"
              src={url}
              className="h-full w-full rounded-md border border-border bg-white"
              data-testid="learning-certificate-preview"
            />
          )}
        </DialogBody>
        <DialogFooter className="shrink-0 !py-2.5">
          {manual || certificate.issueNotes ? (
            <p className="mr-auto max-w-md text-left text-xs text-muted-foreground">
              {manual ? 'Issued manually' : null}
              {manual && certificate.issueNotes ? ' — ' : null}
              {certificate.issueNotes ?? null}
            </p>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" disabled={!url} onClick={() => url && window.open(url, '_blank', 'noopener')}>
            <ExternalLink className="mr-1 h-4 w-4" /> Open / download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
