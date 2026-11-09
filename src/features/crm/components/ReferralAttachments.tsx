import * as React from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { toastApiError } from '@/shared/lib/toast'
import {
  fetchReferralAttachment,
  fetchReferralAttachmentText,
  type ReferralEmail,
} from '@/features/crm/api/referral-inbox.api'

type Attachment = ReferralEmail['attachments'][number]
type View =
  | { kind: 'loading' }
  | { kind: 'pdf' | 'image'; url: string }
  | { kind: 'text'; text: string; url: string }
  | { kind: 'none'; url: string }

const isWord = (a: Attachment) => /wordprocessingml/.test(a.mimeType) || /\.docx$/i.test(a.fileName)
const sizeLabel = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/**
 * The files that came with a referral email. Each opens in a viewer on the page (PDFs and images as
 * they are, Word files as their text), with a Download button. No new tab is needed.
 */
export function ReferralAttachments({ email }: { email: Pick<ReferralEmail, 'id' | 'attachments'> }) {
  const [open, setOpen] = React.useState<Attachment | null>(null)
  const [view, setView] = React.useState<View>({ kind: 'loading' })

  React.useEffect(() => {
    if (!open) return
    let url = ''
    let cancelled = false
    setView({ kind: 'loading' })
    ;(async () => {
      try {
        const blob = await fetchReferralAttachment(email.id, open.index)
        url = URL.createObjectURL(blob)
        if (cancelled) return
        const type = blob.type || open.mimeType
        if (type === 'application/pdf') setView({ kind: 'pdf', url })
        else if (type.startsWith('image/')) setView({ kind: 'image', url })
        else if (type.startsWith('text/')) setView({ kind: 'text', text: await blob.text(), url })
        else if (isWord(open)) {
          const r = await fetchReferralAttachmentText(email.id, open.index)
          if (!cancelled) setView(r.text.trim() ? { kind: 'text', text: r.text, url } : { kind: 'none', url })
        } else setView({ kind: 'none', url })
      } catch (err) {
        if (!cancelled) {
          toastApiError(err, 'Could not open the attachment')
          setOpen(null)
        }
      }
    })()
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, email.id])

  if (!email.attachments.length) return null
  const url = view.kind === 'loading' ? '' : view.url

  return (
    <>
      <div className="flex flex-wrap gap-2" data-testid="referral-attachments">
        {email.attachments.map(a => (
          <Button
            key={a.index}
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={!a.available}
            title={a.skippedReason ?? undefined}
            onClick={() => setOpen(a)}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden />
            {a.fileName}
          </Button>
        ))}
      </div>

      <Dialog open={Boolean(open)} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent size="xl" className="h-[90vh]">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{open?.fileName}</DialogTitle>
            <DialogDescription>
              {open ? `${sizeLabel(open.size)}${open && isWord(open) ? ' · Word document, shown as text' : ''}` : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="p-0">
            {view.kind === 'loading' ? (
              <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Opening…
              </p>
            ) : view.kind === 'pdf' ? (
              <iframe title={open?.fileName} src={view.url} className="h-full min-h-[60vh] w-full border-0" />
            ) : view.kind === 'image' ? (
              <div className="flex justify-center p-4">
                <img src={view.url} alt={open?.fileName} className="max-w-full" />
              </div>
            ) : view.kind === 'text' ? (
              <pre className="whitespace-pre-wrap p-5 font-sans text-sm leading-relaxed">{view.text}</pre>
            ) : (
              <p className="p-5 text-sm text-muted-foreground">This file can't be shown here. Download it to open it.</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>
              Close
            </Button>
            {url && open ? (
              <Button asChild className="gap-1.5">
                <a href={url} download={open.fileName}>
                  <Download className="h-4 w-4" aria-hidden /> Download
                </a>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
