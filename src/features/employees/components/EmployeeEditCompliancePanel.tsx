import * as React from 'react'
import { Download, Eye, Save, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
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
  useCreateEmployeeCompliance,
  useDeleteComplianceDocument,
  useDownloadComplianceDocument,
  useEmployeeComplianceChecklist,
  useUpdateEmployeeCompliance,
  useUploadComplianceDocument,
} from '@/features/employees/hooks/useEmployeeCompliance'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
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

function sortDocsNewestFirst(docs: EmployeeComplianceDocumentRow[]): EmployeeComplianceDocumentRow[] {
  return [...docs].sort((a, b) => {
    const ta = Date.parse(a.uploadedAt)
    const tb = Date.parse(b.uploadedAt)
    if (Number.isFinite(tb) && Number.isFinite(ta) && tb !== ta) return tb - ta
    return b.id.localeCompare(a.id)
  })
}

function canPreviewComplianceFile(doc: EmployeeComplianceDocumentRow): boolean {
  const mime = (doc.mimeType ?? '').toLowerCase()
  const name = (doc.originalName || doc.fileName || '').toLowerCase()
  return mime.includes('pdf') || mime.startsWith('image/') || name.endsWith('.pdf') || /\.(jpe?g|png|gif|webp)$/.test(name)
}

export function EmployeeEditCompliancePanel({ employeeId }: { employeeId: string }) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canRead = useAuthStore(s => s.can('employees.compliance.read'))
  const canCreate = useAuthStore(s => s.can('employees.compliance.create'))
  const canUpdate = useAuthStore(s => s.can('employees.compliance.update'))
  const canUpload = useAuthStore(s => s.can('employees.compliance.documents.upload'))
  const canDownload = useAuthStore(s => s.can('employees.compliance.documents.download'))
  const canDeleteDoc = useAuthStore(s => s.can('employees.compliance.documents.delete'))

  const createMutation = useCreateEmployeeCompliance()
  const updateMutation = useUpdateEmployeeCompliance()
  const uploadMutation = useUploadComplianceDocument()
  const deleteDocMutation = useDeleteComplianceDocument()
  const downloadMutation = useDownloadComplianceDocument()
  const checklistQuery = useEmployeeComplianceChecklist(
    employeeId,
    canCreate,
    Boolean(employeeId && apiConfigured && jwtPresent && canRead),
  )

  const [workAreaName, setWorkAreaName] = React.useState('—')
  const [items, setItems] = React.useState<ComplianceChecklistItem[]>([])
  const [drafts, setDrafts] = React.useState<Record<string, ItemDraft>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hideNoLongerRequired, setHideNoLongerRequired] = React.useState(true)
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null)
  const [docActionKey, setDocActionKey] = React.useState<string | null>(null)

  const loading = checklistQuery.isLoading

  const applyChecklist = React.useCallback((data: { workAreaName: string | null; items: ComplianceChecklistItem[] }) => {
    setWorkAreaName(data.workAreaName ?? '—')
    setItems(data.items)
    const next: Record<string, ItemDraft> = {}
    for (const item of data.items) {
      next[item.complianceTypeId] = draftFromItem(item)
    }
    setDrafts(next)
  }, [])

  React.useEffect(() => {
    if (checklistQuery.data) {
      applyChecklist(checklistQuery.data)
      setError(null)
    } else if (checklistQuery.error) {
      setError(
        checklistQuery.error instanceof ApiError
          ? checklistQuery.error.message
          : 'Could not load compliance checklist.',
      )
      setItems([])
    }
  }, [checklistQuery.data, checklistQuery.error, applyChecklist])

  const visibleItems = React.useMemo(
    () =>
      hideNoLongerRequired
        ? items.filter(i => !i.record?.isNoLongerRequired)
        : items,
    [hideNoLongerRequired, items],
  )

  const hasDbsRow = React.useMemo(
    () => visibleItems.some(item => item.code === 'DBS_CODE'),
    [visibleItems],
  )

  const setDraft = (typeId: string, patch: Partial<ItemDraft>) => {
    setDrafts(prev => {
      const current = prev[typeId]
      if (!current) return prev
      return { ...prev, [typeId]: { ...current, ...patch } }
    })
  }

  const ensureRecord = async (item: ComplianceChecklistItem): Promise<EmployeeComplianceRow> => {
    if (item.record) return item.record
    if (!canCreate) throw new ApiError('You cannot create compliance records.', 403)
    return createMutation.mutateAsync({
      employeeId,
      body: {
        complianceTypeId: item.complianceTypeId,
        requirementId: item.requirementId ?? undefined,
      },
    })
  }

  const onSaveItem = async (item: ComplianceChecklistItem) => {
    if (!canUpdate && !canCreate) return
    const d = drafts[item.complianceTypeId]
    if (!d) return
    setSavingKey(item.complianceTypeId)
    setBanner(null)
    try {
      const row = await ensureRecord(item)
      const notes = serializeComplianceNotes(item.code, d.notes, d.dbsCode, d.transferable)
      await updateMutation.mutateAsync({
        employeeId,
        complianceId: row.id,
        body: {
          ...complianceDatesToPayload(d.issueDate, d.expiryDate),
          notes,
        },
      })
      setBanner({ type: 'success', text: `${item.name} saved.` })
    } catch (e) {
      setBanner({ type: 'error', text: e instanceof ApiError ? e.message : 'Save failed.' })
    } finally {
      setSavingKey(null)
    }
  }

  const onUpload = async (item: ComplianceChecklistItem, file: File) => {
    if (!canUpload) return
    setUploadingKey(item.complianceTypeId)
    setBanner(null)
    try {
      const row = await ensureRecord(item)
      await uploadMutation.mutateAsync({ employeeId, complianceId: row.id, file })
      setBanner({ type: 'success', text: 'Document uploaded. Previous files stay on this record.' })
    } catch (e) {
      setBanner({ type: 'error', text: e instanceof ApiError ? e.message : 'Upload failed.' })
    } finally {
      setUploadingKey(null)
    }
  }

  const onDocumentFileAction = async (
    item: ComplianceChecklistItem,
    doc: EmployeeComplianceDocumentRow,
    mode: 'view' | 'download',
  ) => {
    if (!item.record || !canDownload) return
    const key = `${doc.id}:${mode}`
    setDocActionKey(key)
    setBanner(null)
    try {
      await downloadMutation.mutateAsync({
        employeeId,
        complianceId: item.record.id,
        documentId: doc.id,
        downloadName: doc.originalName || doc.fileName,
        mode,
      })
    } catch (e) {
      setBanner({
        type: 'error',
        text: e instanceof ApiError ? e.message : mode === 'view' ? 'Could not open document.' : 'Download failed.',
      })
    } finally {
      setDocActionKey(null)
    }
  }

  const onRemoveDocument = (item: ComplianceChecklistItem, doc: EmployeeComplianceDocumentRow) => {
    if (!item.record || !canDeleteDoc) return
    if (!window.confirm('Delete this file? Previous files on this compliance item are kept unless you remove them.')) {
      return
    }
    void deleteDocMutation
      .mutateAsync({
        employeeId,
        complianceId: item.record.id,
        documentId: doc.id,
      })
      .then(() => setBanner({ type: 'success', text: 'Document removed.' }))
      .catch(e =>
        setBanner({
          type: 'error',
          text: e instanceof ApiError ? e.message : 'Could not remove document.',
        }),
      )
  }

  const showRowActions = canUpdate || canCreate || canDownload || canDeleteDoc

  if (!apiConfigured || !jwtPresent) {
    return (
      <p className="text-sm text-muted-foreground">
        {apiConfigured ? 'Sign in to manage compliance.' : 'Set VITE_API_BASE_URL and sign in.'}
      </p>
    )
  }

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        Your role does not include <span className="font-mono">employees.compliance.read</span>.
      </p>
    )
  }

  return (
    <div className="space-y-5" data-testid="employee-edit-compliance-panel">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Compliance Document</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Uploading a new file keeps previous files on this item. The newest is marked Current; older files stay listed
          so you can view or download them.
        </p>
      </div>

      {banner ? (
        <div
          role="status"
          className={cn(
            'rounded-lg border px-4 py-3 text-sm',
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'border-destructive/40 bg-destructive/10 text-destructive',
          )}
        >
          {banner.text}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-end gap-6">
        <div className="min-w-[12rem] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Work area</label>
          <Input value={workAreaName} readOnly className="h-9 bg-muted/30" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={hideNoLongerRequired} onCheckedChange={setHideNoLongerRequired} />
          Hide no longer required
        </label>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading compliance checklist…</p> : null}

      {!loading && visibleItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No compliance items are required for this employee&apos;s work area. Assign a work area on the Employment tab
          and re-open this page.
        </p>
      ) : null}

      {!loading && visibleItems.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table
            className="w-full min-w-[1040px] text-sm"
            data-testid="employee-edit-compliance-table"
          >
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Document</th>
                {hasDbsRow ? <th className="px-3 py-2 font-medium">DBS code</th> : null}
                {hasDbsRow ? <th className="px-3 py-2 font-medium">Transferable</th> : null}
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Start date</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Expiry date</th>
                {showRowActions ? (
                  <th className="w-36 px-2 py-2 text-right font-medium">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map(item => {
                const d = drafts[item.complianceTypeId] ?? draftFromItem(item)
                const row = item.record
                const isDbsCode = item.code === 'DBS_CODE'
                const busy = savingKey === item.complianceTypeId || uploadingKey === item.complianceTypeId
                const docs = sortDocsNewestFirst(row?.documents ?? [])
                const currentDoc = docs[0]
                const previousDocs = docs.slice(1)
                const locked = busy || (!canUpdate && !canCreate)
                const currentBusy = currentDoc ? docActionKey?.startsWith(`${currentDoc.id}:`) : false

                return (
                  <tr
                    key={item.complianceTypeId}
                    className="border-b border-border last:border-0 align-top"
                    data-testid={`compliance-item-${item.code ?? item.complianceTypeId}`}
                  >
                    <td className="px-3 py-2 font-medium">
                      {item.name}
                      {item.isMandatory ? (
                        <span className="ml-0.5 text-destructive" title="Required">
                          *
                        </span>
                      ) : null}
                    </td>
                    {hasDbsRow ? (
                      <td className="px-3 py-2">
                        {isDbsCode ? (
                          <Input
                            className="h-8 min-w-[10rem]"
                            value={d.dbsCode}
                            disabled={locked}
                            placeholder="e.g. 001840292079"
                            onChange={e => setDraft(item.complianceTypeId, { dbsCode: e.target.value })}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ) : null}
                    {hasDbsRow ? (
                      <td className="px-3 py-2">
                        {isDbsCode ? (
                          <label className="flex h-8 items-center gap-2 text-sm">
                            <Switch
                              checked={d.transferable}
                              disabled={locked}
                              onCheckedChange={v => setDraft(item.complianceTypeId, { transferable: v })}
                            />
                            {d.transferable ? 'Yes' : 'No'}
                          </label>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      <div className="min-w-[18rem] space-y-1">
                        {canUpload ? (
                          <label
                            className={cn(
                              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground hover:border-primary/50 hover:bg-muted/30',
                              busy && 'pointer-events-none opacity-60',
                            )}
                          >
                            <Upload className="h-3.5 w-3.5 shrink-0" />
                            {uploadingKey === item.complianceTypeId ? 'Uploading…' : 'Upload'}
                            <input
                              type="file"
                              accept={ACCEPT}
                              className="sr-only"
                              disabled={busy}
                              onChange={e => {
                                const f = e.target.files?.[0]
                                e.target.value = ''
                                if (f) void onUpload(item, f)
                              }}
                            />
                          </label>
                        ) : null}
                        {docs.length === 0 && !canUpload ? (
                          <span className="text-xs text-muted-foreground">No document uploaded</span>
                        ) : null}
                        {currentDoc ? (
                          <div
                            className="flex items-center gap-2 py-0.5"
                            data-testid={`compliance-file-${currentDoc.id}`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex min-w-0 items-center gap-1.5">
                                <Badge variant="success" size="sm">
                                  Current
                                </Badge>
                                {row?.status === 'EXPIRED' ? (
                                  <Badge variant="destructive" size="sm">
                                    Expired
                                  </Badge>
                                ) : null}
                                {row?.status === 'EXPIRING_SOON' ? (
                                  <Badge variant="warning" size="sm">
                                    Expiring
                                  </Badge>
                                ) : null}
                                <span
                                  className="truncate text-xs font-medium text-foreground"
                                  title={currentDoc.originalName || currentDoc.fileName}
                                >
                                  {currentDoc.originalName || currentDoc.fileName}
                                </span>
                              </div>
                              <p className="pl-0.5 text-[11px] text-muted-foreground">
                                {formatDate(currentDoc.uploadedAt) || '—'}
                              </p>
                            </div>
                          </div>
                        ) : null}
                        {previousDocs.map(doc => {
                          const fileBusy = docActionKey?.startsWith(`${doc.id}:`)
                          const viewing = docActionKey === `${doc.id}:view`
                          const downloading = docActionKey === `${doc.id}:download`
                          const fileName = doc.originalName || doc.fileName
                          return (
                            <div
                              key={doc.id}
                              className="flex items-center gap-2 py-0.5 text-muted-foreground"
                              data-testid={`compliance-file-${doc.id}`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <Badge variant="muted" size="sm">
                                    Previous
                                  </Badge>
                                  <span className="truncate text-xs font-medium text-foreground" title={fileName}>
                                    {fileName}
                                  </span>
                                </div>
                                <p className="pl-0.5 text-[11px] text-muted-foreground">
                                  {formatDate(doc.uploadedAt) || '—'}
                                </p>
                              </div>
                              <div className="flex shrink-0 items-center">
                                {canDownload && canPreviewComplianceFile(doc) ? (
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    title={viewing ? 'Opening…' : 'View'}
                                    aria-label={`View ${fileName}`}
                                    disabled={busy || fileBusy}
                                    onClick={() => void onDocumentFileAction(item, doc, 'view')}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                                {canDownload ? (
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    title={downloading ? 'Downloading…' : 'Download'}
                                    aria-label={`Download ${fileName}`}
                                    disabled={busy || fileBusy}
                                    onClick={() => void onDocumentFileAction(item, doc, 'download')}
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
                                    disabled={busy || deleteDocMutation.isPending}
                                    onClick={() => onRemoveDocument(item, doc)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        className="h-8 min-w-[10rem]"
                        value={d.notes}
                        disabled={locked}
                        onChange={e => setDraft(item.complianceTypeId, { notes: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        className="h-8 w-[10.5rem]"
                        value={d.issueDate}
                        disabled={locked}
                        onChange={e => setDraft(item.complianceTypeId, { issueDate: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        className="h-8 w-[10.5rem]"
                        value={d.expiryDate}
                        disabled={locked}
                        onChange={e => setDraft(item.complianceTypeId, { expiryDate: e.target.value })}
                      />
                    </td>
                    {showRowActions ? (
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end">
                          {canDownload ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              title={
                                !currentDoc
                                  ? 'No file to view'
                                  : docActionKey === `${currentDoc.id}:view`
                                    ? 'Opening…'
                                    : 'View'
                              }
                              aria-label={
                                currentDoc
                                  ? `View ${currentDoc.originalName || currentDoc.fileName}`
                                  : 'View'
                              }
                              disabled={busy || !currentDoc || currentBusy}
                              onClick={() => currentDoc && void onDocumentFileAction(item, currentDoc, 'view')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canDownload ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              title={
                                !currentDoc
                                  ? 'No file to download'
                                  : docActionKey === `${currentDoc.id}:download`
                                    ? 'Downloading…'
                                    : 'Download'
                              }
                              aria-label={
                                currentDoc
                                  ? `Download ${currentDoc.originalName || currentDoc.fileName}`
                                  : 'Download'
                              }
                              disabled={busy || !currentDoc || currentBusy}
                              onClick={() => currentDoc && void onDocumentFileAction(item, currentDoc, 'download')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canDeleteDoc ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              title={!currentDoc ? 'No file to delete' : 'Delete'}
                              aria-label={
                                currentDoc
                                  ? `Delete ${currentDoc.originalName || currentDoc.fileName}`
                                  : 'Delete'
                              }
                              className="text-muted-foreground hover:text-destructive"
                              disabled={busy || !currentDoc || deleteDocMutation.isPending}
                              onClick={() => currentDoc && onRemoveDocument(item, currentDoc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canUpdate || canCreate ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              title={savingKey === item.complianceTypeId ? 'Saving…' : 'Save'}
                              aria-label={`Save ${item.name}`}
                              disabled={busy}
                              onClick={() => void onSaveItem(item)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
