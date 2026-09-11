import * as React from 'react'
import { Download, Eye, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import type {
  ComplianceChecklistItem,
  EmployeeComplianceDocumentRow,
  EmployeeComplianceRow,
} from '@/features/employees/types'
import { parseComplianceNotes, serializeComplianceNotes } from '@/features/employees/compliance/compliance-dbs-notes'
import {
  complianceDatesToPayload,
  complianceIsoToDateInput,
} from '@/features/employees/compliance/compliance-form-utils'
import {
  docsForVersionFilter,
  formatComplianceUploaderLabel,
  sortDocsNewestFirst,
} from '@/features/employees/compliance/compliance-document-filters'
import {
  useCreateEmployeeCompliance,
  useDeleteComplianceDocument,
  useDownloadComplianceDocument,
  useUpdateEmployeeCompliance,
  useUploadComplianceDocument,
} from '@/features/employees/hooks/useEmployeeCompliance'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import { Switch } from '@/shared/ui/toggle-controls'
import { cn, formatDate } from '@/shared/lib/utils'

const ACCEPT =
  'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

type ItemDraft = {
  issueDate: string
  expiryDate: string
  notes: string
  dbsCode: string
  transferable: boolean
}

function draftFromItem(item: ComplianceChecklistItem): ItemDraft {
  const row = item.record
  const parsed = parseComplianceNotes(row?.notes, item.code)
  return {
    issueDate: complianceIsoToDateInput(row?.issueDate),
    expiryDate: complianceIsoToDateInput(row?.expiryDate),
    notes: parsed.userNotes,
    dbsCode: parsed.dbsCode,
    transferable: parsed.transferable,
  }
}

function canPreviewComplianceFile(doc: EmployeeComplianceDocumentRow): boolean {
  const mime = (doc.mimeType ?? '').toLowerCase()
  const name = (doc.originalName || doc.fileName || '').toLowerCase()
  return mime.includes('pdf') || mime.startsWith('image/') || name.endsWith('.pdf') || /\.(jpe?g|png|gif|webp)$/.test(name)
}

function statusLabel(status: string | undefined): string {
  if (!status) return 'Missing'
  return status
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId: string
  item: ComplianceChecklistItem | null
  canCreate: boolean
  canUpdate: boolean
  canUpload: boolean
  canDownload: boolean
  canDeleteDoc: boolean
  onBanner: (banner: { type: 'success' | 'error'; text: string } | null) => void
}

export function EmployeeComplianceEditSheet({
  open,
  onOpenChange,
  employeeId,
  item,
  canCreate,
  canUpdate,
  canUpload,
  canDownload,
  canDeleteDoc,
  onBanner,
}: Props) {
  const createMutation = useCreateEmployeeCompliance()
  const updateMutation = useUpdateEmployeeCompliance()
  const uploadMutation = useUploadComplianceDocument()
  const deleteDocMutation = useDeleteComplianceDocument()
  const downloadMutation = useDownloadComplianceDocument()

  const [draft, setDraft] = React.useState<ItemDraft | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [docActionKey, setDocActionKey] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && item) setDraft(draftFromItem(item))
    if (!open) {
      setDraft(null)
      setDocActionKey(null)
    }
  }, [open, item])

  const docs = React.useMemo(
    () => sortDocsNewestFirst(item?.record?.documents ?? []),
    [item],
  )
  const { current, previous } = docsForVersionFilter(docs, 'all')
  const locked = saving || uploading || (!canUpdate && !canCreate)
  const isDbsCode = item?.code === 'DBS_CODE'

  const ensureRecord = async (target: ComplianceChecklistItem): Promise<EmployeeComplianceRow> => {
    if (target.record) return target.record
    if (!canCreate) throw new ApiError('You cannot create compliance records.', 403)
    return createMutation.mutateAsync({
      employeeId,
      body: {
        complianceTypeId: target.complianceTypeId,
        requirementId: target.requirementId ?? undefined,
      },
    })
  }

  const onSave = async () => {
    if (!item || !draft || (!canUpdate && !canCreate)) return
    setSaving(true)
    onBanner(null)
    try {
      const row = await ensureRecord(item)
      const notes = serializeComplianceNotes(item.code, draft.notes, draft.dbsCode, draft.transferable)
      await updateMutation.mutateAsync({
        employeeId,
        complianceId: row.id,
        body: {
          ...complianceDatesToPayload(draft.issueDate, draft.expiryDate),
          notes,
        },
      })
      onBanner({ type: 'success', text: `${item.name} saved.` })
      onOpenChange(false)
    } catch (e) {
      onBanner({ type: 'error', text: e instanceof ApiError ? e.message : 'Save failed.' })
    } finally {
      setSaving(false)
    }
  }

  const onUpload = async (file: File) => {
    if (!item || !canUpload) return
    setUploading(true)
    onBanner(null)
    try {
      const row = await ensureRecord(item)
      await uploadMutation.mutateAsync({ employeeId, complianceId: row.id, file })
      onBanner({ type: 'success', text: 'Document uploaded. Previous files stay on this record.' })
    } catch (e) {
      onBanner({ type: 'error', text: e instanceof ApiError ? e.message : 'Upload failed.' })
    } finally {
      setUploading(false)
    }
  }

  const onDocumentFileAction = async (
    doc: EmployeeComplianceDocumentRow,
    mode: 'view' | 'download',
  ) => {
    if (!item?.record || !canDownload) return
    const key = `${doc.id}:${mode}`
    setDocActionKey(key)
    onBanner(null)
    try {
      await downloadMutation.mutateAsync({
        employeeId,
        complianceId: item.record.id,
        documentId: doc.id,
        downloadName: doc.originalName || doc.fileName,
        mode,
      })
    } catch (e) {
      onBanner({
        type: 'error',
        text: e instanceof ApiError ? e.message : mode === 'view' ? 'Could not open document.' : 'Download failed.',
      })
    } finally {
      setDocActionKey(null)
    }
  }

  const onRemoveDocument = (doc: EmployeeComplianceDocumentRow) => {
    if (!item?.record || !canDeleteDoc) return
    if (!window.confirm('Delete this file? Previous files on this compliance item are kept unless you remove them.')) {
      return
    }
    void deleteDocMutation
      .mutateAsync({
        employeeId,
        complianceId: item.record.id,
        documentId: doc.id,
      })
      .then(() => onBanner({ type: 'success', text: 'Document removed.' }))
      .catch(e =>
        onBanner({
          type: 'error',
          text: e instanceof ApiError ? e.message : 'Could not remove document.',
        }),
      )
  }

  const renderDocRow = (doc: EmployeeComplianceDocumentRow, kind: 'current' | 'previous') => {
    const fileName = doc.originalName || doc.fileName
    const fileBusy = docActionKey?.startsWith(`${doc.id}:`)
    const uploader = formatComplianceUploaderLabel(doc.uploadedBy)
    return (
      <div
        key={doc.id}
        className="rounded-md border border-border bg-muted/20 px-3 py-2"
        data-testid={`compliance-sheet-file-${doc.id}`}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={kind === 'current' ? 'success' : 'muted'} size="sm">
                {kind === 'current' ? 'Current' : 'Previous'}
              </Badge>
              <span className="truncate text-sm font-medium" title={fileName}>
                {fileName}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Uploaded {formatDate(doc.uploadedAt) || '—'} by {uploader}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            {canDownload && canPreviewComplianceFile(doc) ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                title="View"
                aria-label={`View ${fileName}`}
                disabled={saving || uploading || fileBusy}
                onClick={() => void onDocumentFileAction(doc, 'view')}
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {canDownload ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                title="Download"
                aria-label={`Download ${fileName}`}
                disabled={saving || uploading || fileBusy}
                onClick={() => void onDocumentFileAction(doc, 'download')}
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
            ) : null}
            {canDeleteDoc ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                title="Delete"
                aria-label={`Delete ${fileName}`}
                className="text-muted-foreground hover:text-destructive"
                disabled={saving || uploading || deleteDocMutation.isPending}
                onClick={() => onRemoveDocument(doc)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="flex w-full flex-col sm:max-w-lg" data-testid="employee-compliance-edit-sheet">
        <SheetHeader>
          <SheetTitle>{item?.name ?? 'Compliance document'}</SheetTitle>
          <SheetDescription>
            View and edit this compliance item. Uploading a new file keeps previous files on the record.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {!item || !draft ? (
            <p className="text-sm text-muted-foreground">No item selected.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="muted" size="sm">
                  {statusLabel(item.record?.status)}
                </Badge>
                {item.isMandatory ? (
                  <Badge variant="destructive" size="sm">
                    Required
                  </Badge>
                ) : null}
                {item.record?.status === 'EXPIRED' ? (
                  <Badge variant="destructive" size="sm">
                    Expired
                  </Badge>
                ) : null}
                {item.record?.status === 'EXPIRING_SOON' ? (
                  <Badge variant="warning" size="sm">
                    Expiring
                  </Badge>
                ) : null}
              </div>

              {isDbsCode ? (
                <div className="space-y-3 rounded-md border border-border p-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">DBS code</label>
                    <Input
                      value={draft.dbsCode}
                      disabled={locked}
                      placeholder="e.g. 001840292079"
                      onChange={e => setDraft({ ...draft, dbsCode: e.target.value })}
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={draft.transferable}
                      disabled={locked}
                      onCheckedChange={v => setDraft({ ...draft, transferable: v })}
                    />
                    Transferable {draft.transferable ? '(Yes)' : '(No)'}
                  </label>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Input
                  value={draft.notes}
                  disabled={locked}
                  onChange={e => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Start date</label>
                  <Input
                    type="date"
                    value={draft.issueDate}
                    disabled={locked}
                    onChange={e => setDraft({ ...draft, issueDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Expiry date</label>
                  <Input
                    type="date"
                    value={draft.expiryDate}
                    disabled={locked}
                    onChange={e => setDraft({ ...draft, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Files</label>
                  {canUpload ? (
                    <label
                      className={cn(
                        'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground hover:border-primary/50 hover:bg-muted/30',
                        (saving || uploading) && 'pointer-events-none opacity-60',
                      )}
                    >
                      <Upload className="h-3.5 w-3.5 shrink-0" />
                      {uploading ? 'Uploading…' : 'Upload'}
                      <input
                        type="file"
                        accept={ACCEPT}
                        className="sr-only"
                        disabled={saving || uploading}
                        onChange={e => {
                          const f = e.target.files?.[0]
                          e.target.value = ''
                          if (f) void onUpload(f)
                        }}
                      />
                    </label>
                  ) : null}
                </div>
                {docs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No document uploaded.</p>
                ) : (
                  <div className="space-y-2">
                    {current ? renderDocRow(current, 'current') : null}
                    {previous.map(doc => renderDocRow(doc, 'previous'))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetBody>

        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {canUpdate || canCreate ? (
            <Button type="button" disabled={!item || !draft || locked} onClick={() => void onSave()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
