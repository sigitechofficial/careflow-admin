import * as React from 'react'
import { Download, Paperclip } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import {
  formatOrganisationDate,
  formatOrganisationDateTime,
} from '@/shared/lib/organisation-display-format.store'
import {
  downloadLinkedDocument,
  useServiceUserDocumentTypes,
  useUploadLinkedDocument,
} from '@/features/service-users/referrals/useReferrals'
import type { LinkedDocument, ReferralEvent } from '@/features/service-users/referrals/referral-types'
import {
  PAYER_TYPE_LABEL,
  QUOTATION_STATUS_LABEL,
  REFERRAL_EVENT_LABEL,
  REFERRAL_PRIORITY_LABEL,
  REFERRAL_SOURCE_LABEL,
  REFERRAL_STATUS_LABEL,
  REFERRAL_VIA_LABEL,
} from '@/features/service-users/referrals/referral-labels'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

/** Stored codes shown with their labels (priority, source, payer type…). */
const CODE_LABELS: Record<string, string> = {
  ...REFERRAL_PRIORITY_LABEL,
  ...REFERRAL_SOURCE_LABEL,
  ...REFERRAL_VIA_LABEL,
  ...PAYER_TYPE_LABEL,
}

/** ISO-looking change values are shown as dates in organisation format. */
function showValue(v: string | null): string {
  if (v == null || v === '') return '—'
  if (CODE_LABELS[v]) return CODE_LABELS[v]
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return formatOrganisationDateTime(v)
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return formatOrganisationDate(v)
  return v
}

const STATUS_WORDS: Record<string, string> = { ...QUOTATION_STATUS_LABEL, ...REFERRAL_STATUS_LABEL }
function statusWord(s: string | null) {
  if (!s) return ''
  return STATUS_WORDS[s] ?? s
}

/** Timeline of referral / quotation events with who, when and what changed. */
export function ReferralHistoryList({
  events,
  showReference = false,
  emptyText = 'No history yet.',
}: {
  events: ReferralEvent[]
  showReference?: boolean
  emptyText?: string
}) {
  if (!events.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>
  return (
    <ol className="space-y-3" data-testid="referral-history">
      {events.map(e => (
        <li key={e.id} className="border-l-2 border-border pl-3">
          <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium text-foreground">{REFERRAL_EVENT_LABEL[e.action] ?? e.action}</span>
            {e.fromStatus || e.toStatus ? (
              <span className="text-xs text-muted-foreground">
                {e.fromStatus ? `${statusWord(e.fromStatus)} → ` : ''}
                {statusWord(e.toStatus)}
              </span>
            ) : null}
            {showReference && (e.quotationReference || e.referralReference) ? (
              <span className="text-xs text-muted-foreground">
                · {e.quotationReference ?? e.referralReference}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatOrganisationDateTime(e.createdAt)}
            {e.userName ? ` · ${e.userName}` : ''}
          </div>
          {e.note ? <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{e.note}</p> : null}
          {e.changes.length ? (
            <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              {e.changes.map((c, i) => (
                <li key={i}>
                  <span className="font-medium text-foreground">{c.field}:</span> {showValue(c.from)} →{' '}
                  {showValue(c.to)}
                </li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

/** Files linked to a referral / quotation; stored in the service user's Documents. */
export function LinkedDocumentsPanel({
  serviceUserId,
  linkType,
  linkId,
  documentTypeCode,
  documents,
  canUpload,
}: {
  serviceUserId: string
  linkType: string
  linkId: string
  documentTypeCode: 'REFERRAL_DOCUMENT' | 'CARE_QUOTATION'
  documents: LinkedDocument[]
  canUpload: boolean
}) {
  const typesQuery = useServiceUserDocumentTypes(canUpload)
  const upload = useUploadLinkedDocument(serviceUserId)
  const [file, setFile] = React.useState<File | null>(null)
  const [title, setTitle] = React.useState('')
  const [inputKey, setInputKey] = React.useState(0)
  const docType = (typesQuery.data ?? []).find(t => t.code === documentTypeCode)

  const onUpload = async () => {
    if (!file || !docType) return
    try {
      await upload.mutateAsync({
        file,
        documentTypeId: docType.id,
        title: title.trim() || file.name,
        documentDate: operationalTodayIso(),
        linkedRecordType: linkType,
        linkedRecordId: linkId,
      })
      toastSuccess('Document uploaded', 'Also listed under the service user’s Documents.')
      setFile(null)
      setTitle('')
      setInputKey(k => k + 1)
    } catch (e) {
      toastApiError(e, e instanceof ApiError ? e.message : 'Upload failed.')
    }
  }

  return (
    <div className="space-y-2" data-testid="linked-documents">
      {documents.length ? (
        <ul className="divide-y divide-border rounded-md border border-border">
          {documents.map(d => (
            <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{d.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatOrganisationDate(d.uploadedAt)}</span>
              </span>
              <button
                type="button"
                className="rounded p-1 text-primary hover:bg-primary/10"
                title="Download"
                onClick={() =>
                  void downloadLinkedDocument(serviceUserId, d.id, d.fileName ?? d.title).catch(err =>
                    toastApiError(err, 'Download failed.'),
                  )
                }
              >
                <Download className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No documents attached.</p>
      )}
      {canUpload ? (
        <div className="flex flex-wrap items-end gap-2">
          <Input
            key={inputKey}
            type="file"
            className="max-w-xs"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            data-testid="linked-document-file"
          />
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="max-w-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!file || !docType || upload.isPending}
            onClick={() => void onUpload()}
            data-testid="linked-document-upload"
          >
            {upload.isPending ? 'Uploading…' : 'Attach'}
          </Button>
          {!typesQuery.isLoading && !docType ? (
            <p className="w-full text-xs text-destructive">Document type {documentTypeCode} is missing in the catalogue.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
