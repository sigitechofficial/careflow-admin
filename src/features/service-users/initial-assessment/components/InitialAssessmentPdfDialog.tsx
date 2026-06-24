import * as React from 'react'
import { FileDown, Loader2 } from 'lucide-react'
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
  downloadInitialAssessmentCqcEvidence,
  downloadInitialAssessmentPdf,
} from '@/features/service-users/initial-assessment/api'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import type { InitialAssessmentSection, InitialAssessmentSubmission } from '@/features/service-users/initial-assessment/types'
import { formatInitialAssessmentDateTime } from '@/features/service-users/initial-assessment/utils/submission-display'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  serviceUserId: string
  submission: InitialAssessmentSubmission | null | undefined
  sections: InitialAssessmentSection[]
  canExportSecure?: boolean
  onPreviewHtml?: () => void
}

export function InitialAssessmentPdfDialog({
  open,
  onOpenChange,
  serviceUserId,
  submission,
  sections,
  canExportSecure = false,
  onPreviewHtml,
}: Props) {
  const [downloading, setDownloading] = React.useState(false)
  const [downloadingCqc, setDownloadingCqc] = React.useState(false)
  const [includeSecureFields, setIncludeSecureFields] = React.useState(false)

  const onDownload = async () => {
    if (!submission?.id || !serviceUserId) return
    setDownloading(true)
    try {
      await downloadInitialAssessmentPdf(serviceUserId, submission.id, {
        includeSecureFields: canExportSecure && includeSecureFields,
      })
      toastSuccess('PDF downloaded', 'Initial assessment export saved to your downloads folder.')
      onOpenChange(false)
    } catch (e) {
      toastApiError(e, 'PDF export failed')
    } finally {
      setDownloading(false)
    }
  }

  const onDownloadCqc = async () => {
    if (!submission?.id || !serviceUserId) return
    setDownloadingCqc(true)
    try {
      await downloadInitialAssessmentCqcEvidence(serviceUserId, submission.id)
      toastSuccess('CQC pack downloaded', 'Evidence JSON saved to your downloads folder.')
    } catch (e) {
      toastApiError(e, 'CQC export failed')
    } finally {
      setDownloadingCqc(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Export assessment</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-muted-foreground">
            Download the full assessment pack: clinical scores, consent and safeguarding summaries, risks, open
            actions, sign-off, manager review, and all answered questions by section. HTML opens in any browser;
            PDF is suitable for printing and records.
          </p>
          <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <h4 className="font-semibold">Initial Assessment — {submission?.status ?? '—'}</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Template v{submission?.template?.version ?? '—'} · Updated{' '}
              {submission ? formatInitialAssessmentDateTime(submission.updatedAt) : '—'}
            </p>
            <ol className="mt-3 list-decimal space-y-1 pl-5">
              {sections.map((s) => (
                <li key={s.id}>
                  {s.sectionNumber}. {s.title} ({s.questions.length} questions)
                </li>
              ))}
            </ol>
          </div>
          {canExportSecure ? (
            <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={includeSecureFields}
                onChange={(e) => setIncludeSecureFields(e.target.checked)}
                disabled={downloading}
              />
              <span>
                <Label className="cursor-pointer font-medium">Include secure access fields</Label>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Door codes and key safe details are withheld by default.
                </span>
              </span>
            </label>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Secure access fields (door code, key safe) are withheld from this export.
            </p>
          )}
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={downloading || downloadingCqc}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onPreviewHtml?.()
            }}
            disabled={!submission?.id || !onPreviewHtml}
          >
            Preview HTML
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void onDownloadCqc()}
            disabled={!submission?.id || downloading || downloadingCqc}
          >
            {downloadingCqc ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting…
              </>
            ) : (
              'Download CQC JSON'
            )}
          </Button>
          <Button
            type="button"
            onClick={() => void onDownload()}
            disabled={!submission?.id || downloading || downloadingCqc}
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
