import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { Archive, Download, FileText, Loader2, Pencil, RotateCcw, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { cn } from '@/shared/lib/utils'
import { formatOrganisationDate } from '@/shared/lib/organisation-display-format.store'
import { useAuthStore } from '@/features/auth/store'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { InfoTip } from '@/features/cqc-mock-inspection/components/InfoTip'
import { CATEGORY_LABEL, SOURCE_LABEL } from '@/features/cqc-mock-inspection/labels'
import { EVIDENCE_FILE_ACCEPT, EVIDENCE_FILE_MAX_BYTES } from '../constants'
import type { CqcEvidenceStatus, EvidenceDetail } from '../types'
import {
  useDownloadEvidenceFile,
  useEvidence,
  useRemoveEvidenceFile,
  useUpdateEvidence,
  useUploadEvidenceFile,
} from '../hooks'
import { HELP } from '../help'

const STATUS_TEXT: Record<CqcEvidenceStatus, string> = {
  CURRENT: 'Current',
  SUPERSEDED: 'Superseded',
  ARCHIVED: 'Archived',
}

const size = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

function period(e: EvidenceDetail) {
  if (e.periodStart && e.periodEnd) {
    const a = formatOrganisationDate(e.periodStart)
    const b = formatOrganisationDate(e.periodEnd)
    return a === b ? b : `${a} – ${b}`
  }
  if (e.periodEnd) return `Up to ${formatOrganisationDate(e.periodEnd)}`
  if (e.periodStart) return `From ${formatOrganisationDate(e.periodStart)}`
  return 'Not given'
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  )
}

/** Files attached to the evidence: download, add and remove. */
function Files({ e, canManage }: { e: EvidenceDetail; canManage: boolean }) {
  const upload = useUploadEvidenceFile(e.id)
  const remove = useRemoveEvidenceFile(e.id)
  const download = useDownloadEvidenceFile(e.id)
  const input = React.useRef<HTMLInputElement>(null)
  const [removing, setRemoving] = React.useState<{ id: string; fileName: string } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const onPick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (file.size > EVIDENCE_FILE_MAX_BYTES) return setError('That file is over 25 MB. Choose a smaller file.')
    try {
      await upload.mutateAsync(file)
      toastSuccess('File attached', file.name)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not attach the file.')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  return (
    <section className="space-y-2" data-testid="evidence-files">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-foreground">Files ({e.attachments.length})</h3>
          <InfoTip label="Files">{HELP.files}</InfoTip>
        </div>
        {canManage ? (
          <>
            <input
              ref={input}
              type="file"
              accept={EVIDENCE_FILE_ACCEPT}
              className="hidden"
              onChange={ev => void onPick(ev.target.files?.[0])}
              data-testid="evidence-file-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => input.current?.click()}
              disabled={upload.isPending}
              data-testid="evidence-attach"
            >
              {upload.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : <Upload className="mr-1 h-3.5 w-3.5" aria-hidden />}
              {upload.isPending ? 'Attaching…' : 'Attach a file'}
            </Button>
          </>
        ) : null}
      </div>
      {e.attachments.length ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {e.attachments.map(a => (
            <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm" data-testid="evidence-file">
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{a.fileName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {size(a.sizeBytes)} · added {formatOrganisationDate(a.createdAt)}
                    {a.uploadedByName ? ` by ${a.uploadedByName}` : ''}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Download ${a.fileName}`}
                  onClick={() =>
                    void download
                      .mutateAsync({ attachmentId: a.id, fileName: a.fileName })
                      .catch(err => toastApiError(err, 'Could not download the file'))
                  }
                >
                  <Download className="h-4 w-4" aria-hidden />
                </Button>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${a.fileName}`}
                    onClick={() => setRemoving({ id: a.id, fileName: a.fileName })}
                    data-testid="evidence-remove-file"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No files yet.{canManage ? ' Attach the audit, certificate, minutes or photo that proves it.' : ''}</p>
      )}
      <p className="text-xs text-muted-foreground">PDF, Word, Excel, PNG or JPEG, up to 25 MB each.</p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <AlertDialog open={!!removing} onOpenChange={o => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.fileName}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer show with this evidence or go into evidence packs. A copy is kept for the audit record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              data-testid="evidence-remove-file-confirm"
              onClick={() => {
                if (!removing) return
                void remove
                  .mutateAsync(removing.id)
                  .then(() => toastSuccess('File removed'))
                  .catch(err => toastApiError(err, 'Could not remove the file'))
              }}
            >
              Remove file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

/** One piece of evidence in full, with its files; edit, archive or bring it back for those who manage evidence. */
export function EvidenceDetailDialog({
  id,
  onOpenChange,
  onEdit,
}: {
  id: string | null
  onOpenChange: (open: boolean) => void
  onEdit: (e: EvidenceDetail) => void
}) {
  const canManage = useAuthStore(s => s.can('cqc_evidence.manage'))
  const query = useEvidence(id)
  const update = useUpdateEvidence(id ?? '')
  const [confirm, setConfirm] = React.useState<CqcEvidenceStatus | null>(null)
  const e = query.data

  const setStatus = async (status: CqcEvidenceStatus) => {
    try {
      await update.mutateAsync({ status })
      toastSuccess(
        status === 'ARCHIVED' ? 'Evidence archived' : status === 'SUPERSEDED' ? 'Marked as superseded' : 'Evidence is current again',
      )
    } catch (err) {
      toastApiError(err, 'Could not change the status')
    }
  }

  return (
    <Dialog open={!!id} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="evidence-detail-dialog">
        <DialogHeader>
          <DialogTitle className="pr-6">{e?.title ?? 'Evidence'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {query.error ? (
            <p className="text-sm text-destructive">
              {query.error instanceof ApiError ? query.error.message : 'Could not load the evidence.'}
            </p>
          ) : null}
          {e ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={e.status === 'CURRENT' ? 'success' : 'secondary'}>{STATUS_TEXT[e.status]}</Badge>
                <Badge variant="outline">{SOURCE_LABEL[e.sourceType] ?? e.sourceType}</Badge>
                <Badge variant="outline">{CATEGORY_LABEL[e.categoryCode] ?? e.categoryTitle}</Badge>
                {e.reviewOverdue ? <Badge variant="warning">Review overdue</Badge> : null}
              </div>
              {e.summary ? <p className="whitespace-pre-line text-sm text-foreground">{e.summary}</p> : null}

              <dl className="space-y-1.5" data-testid="evidence-facts">
                <Fact label="Period">{period(e)}</Fact>
                <Fact label="Covers">{e.locations.length ? e.locations.map(l => l.name).join(', ') : 'Whole organisation'}</Fact>
                <Fact label="Review by">
                  <span className={cn(e.reviewOverdue && 'font-medium text-warning')}>
                    {e.reviewDueAt ? formatOrganisationDate(e.reviewDueAt) : 'Not set'}
                    {e.reviewOverdue ? ' (overdue)' : ''}
                  </span>
                </Fact>
                <Fact label="Added">
                  {formatOrganisationDate(e.createdAt)}
                  {e.addedBy ? ` by ${e.addedBy.name}` : ' by CareFlow (automatic)'}
                </Fact>
                {e.source?.kind === 'survey' ? (
                  <Fact label="From">
                    <Link
                      to="/surveys/$surveyId"
                      params={{ surveyId: e.source.surveyId }}
                      className="font-medium text-primary hover:underline"
                    >
                      Open the survey
                    </Link>
                  </Fact>
                ) : null}
              </dl>

              <section className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">Quality statements it proves</h3>
                <div className="flex flex-wrap gap-1.5">
                  {e.statements
                    .filter(s => s.current)
                    .map(s => (
                      <Badge key={s.id} variant="outline" title={s.keyQuestionTitle}>
                        {s.keyQuestionTitle}: {s.title}
                      </Badge>
                    ))}
                </div>
              </section>

              {e.actions.length ? (
                <section className="space-y-1.5" data-testid="evidence-pairs-view">
                  <h3 className="text-sm font-semibold text-foreground">You said, we did</h3>
                  {e.actions.map((a, i) => (
                    <div key={i} className="grid gap-1 rounded-md bg-muted/40 p-2 text-sm sm:grid-cols-2">
                      <p>
                        <span className="text-xs font-medium text-muted-foreground">You said: </span>
                        {a.youSaid}
                      </p>
                      <p>
                        <span className="text-xs font-medium text-muted-foreground">We did: </span>
                        {a.weDid}
                      </p>
                    </div>
                  ))}
                </section>
              ) : null}

              {e.notes ? (
                <section className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">Notes for your team</h3>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">{e.notes}</p>
                </section>
              ) : null}

              <Files e={e} canManage={canManage} />
            </>
          ) : null}
        </DialogBody>
        <DialogFooter className="flex-wrap gap-2">
          {e && canManage ? (
            <>
              {e.status === 'CURRENT' ? (
                <>
                  <Button variant="outline" onClick={() => setConfirm('SUPERSEDED')} disabled={update.isPending} data-testid="evidence-supersede">
                    Mark as superseded
                  </Button>
                  <Button variant="outline" onClick={() => setConfirm('ARCHIVED')} disabled={update.isPending} data-testid="evidence-archive">
                    <Archive className="mr-1 h-4 w-4" aria-hidden />
                    Archive
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => void setStatus('CURRENT')} disabled={update.isPending} data-testid="evidence-restore">
                  <RotateCcw className="mr-1 h-4 w-4" aria-hidden />
                  Make current again
                </Button>
              )}
              <Button onClick={() => onEdit(e)} data-testid="evidence-edit">
                <Pencil className="mr-1 h-4 w-4" aria-hidden />
                Edit
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>

        <AlertDialog open={!!confirm} onOpenChange={o => !o && setConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirm === 'ARCHIVED' ? 'Archive this evidence?' : 'Mark as superseded?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirm === 'ARCHIVED'
                  ? 'It will no longer count as current evidence or go into evidence packs. It stays on record, and you can make it current again.'
                  : 'Use this when newer evidence replaces it (for example a newer audit). It stops counting as current, stays on record, and can be made current again.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go back</AlertDialogCancel>
              <AlertDialogAction
                data-testid="evidence-status-confirm"
                onClick={() => {
                  if (confirm) void setStatus(confirm)
                }}
              >
                {confirm === 'ARCHIVED' ? 'Archive' : 'Mark as superseded'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
