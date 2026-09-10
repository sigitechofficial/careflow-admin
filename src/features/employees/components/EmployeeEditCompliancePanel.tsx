import * as React from 'react'
import { Download, Eye, Pencil, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { useAuthStore } from '@/features/auth/store'
import type {
  ComplianceChecklistItem,
  EmployeeComplianceDocumentRow,
} from '@/features/employees/types'
import { parseComplianceNotes } from '@/features/employees/compliance/compliance-dbs-notes'
import { complianceIsoToDateInput } from '@/features/employees/compliance/compliance-form-utils'
import {
  COMPLIANCE_DOCUMENT_VERSION_OPTIONS,
  COMPLIANCE_STATUS_FILTER_OPTIONS,
  docsForVersionFilter,
  filterComplianceChecklistItems,
  formatComplianceUploaderLabel,
  sortDocsNewestFirst,
  type ComplianceDocumentVersionFilter,
  type ComplianceStatusFilter,
} from '@/features/employees/compliance/compliance-document-filters'
import {
  useDeleteComplianceDocument,
  useDownloadComplianceDocument,
  useEmployeeComplianceChecklist,
} from '@/features/employees/hooks/useEmployeeCompliance'
import { EmployeeComplianceEditSheet } from '@/features/employees/components/EmployeeComplianceEditSheet'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Switch } from '@/shared/ui/toggle-controls'
import { cn, formatDate } from '@/shared/lib/utils'

function canPreviewComplianceFile(doc: EmployeeComplianceDocumentRow): boolean {
  const mime = (doc.mimeType ?? '').toLowerCase()
  const name = (doc.originalName || doc.fileName || '').toLowerCase()
  return mime.includes('pdf') || mime.startsWith('image/') || name.endsWith('.pdf') || /\.(jpe?g|png|gif|webp)$/.test(name)
}

function statusBadge(item: ComplianceChecklistItem) {
  const status = item.record?.isNoLongerRequired ? 'NO_LONGER_REQUIRED' : item.record?.status
  if (!status) {
    return (
      <Badge variant="muted" size="sm">
        Missing
      </Badge>
    )
  }
  if (status === 'EXPIRED') return <Badge variant="destructive" size="sm">Expired</Badge>
  if (status === 'EXPIRING_SOON') return <Badge variant="warning" size="sm">Near expiry</Badge>
  if (status === 'MISSING' || status === 'REQUIRED') {
    return <Badge variant="muted" size="sm">Missing</Badge>
  }
  if (status === 'PENDING_REVIEW') return <Badge variant="warning" size="sm">Pending</Badge>
  if (status === 'NO_LONGER_REQUIRED' || status === 'NOT_REQUIRED') {
    return <Badge variant="muted" size="sm">Not required</Badge>
  }
  if (status === 'VALID' || status === 'SUBMITTED') {
    return <Badge variant="success" size="sm">Provided</Badge>
  }
  return (
    <Badge variant="muted" size="sm">
      {status.replaceAll('_', ' ').toLowerCase()}
    </Badge>
  )
}

export function EmployeeEditCompliancePanel({
  employeeId,
  initialComplianceTypeCode,
}: {
  employeeId: string
  /** From board deep-link `?complianceType=DBS` — opens that checklist item. */
  initialComplianceTypeCode?: string | null
}) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canRead = useAuthStore(s => s.can('employees.compliance.read'))
  const canCreate = useAuthStore(s => s.can('employees.compliance.create'))
  const canUpdate = useAuthStore(s => s.can('employees.compliance.update'))
  const canUpload = useAuthStore(s => s.can('employees.compliance.documents.upload'))
  const canDownload = useAuthStore(s => s.can('employees.compliance.documents.download'))
  const canDeleteDoc = useAuthStore(s => s.can('employees.compliance.documents.delete'))

  const deleteDocMutation = useDeleteComplianceDocument()
  const downloadMutation = useDownloadComplianceDocument()
  const checklistQuery = useEmployeeComplianceChecklist(
    employeeId,
    canCreate,
    Boolean(employeeId && apiConfigured && jwtPresent && canRead),
  )

  const [workAreaName, setWorkAreaName] = React.useState('—')
  const [items, setItems] = React.useState<ComplianceChecklistItem[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hideNoLongerRequired, setHideNoLongerRequired] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<ComplianceStatusFilter>('all')
  const [versionFilter, setVersionFilter] = React.useState<ComplianceDocumentVersionFilter>('new')
  const [editingTypeId, setEditingTypeId] = React.useState<string | null>(null)
  const [docActionKey, setDocActionKey] = React.useState<string | null>(null)
  const deepLinkApplied = React.useRef(false)

  React.useEffect(() => {
    deepLinkApplied.current = false
  }, [employeeId, initialComplianceTypeCode])

  const loading = checklistQuery.isLoading

  React.useEffect(() => {
    if (checklistQuery.data) {
      setWorkAreaName(checklistQuery.data.workAreaName ?? '—')
      setItems(checklistQuery.data.items)
      setError(null)
    } else if (checklistQuery.error) {
      setError(
        checklistQuery.error instanceof ApiError
          ? checklistQuery.error.message
          : 'Could not load compliance checklist.',
      )
      setItems([])
    }
  }, [checklistQuery.data, checklistQuery.error])

  React.useEffect(() => {
    if (deepLinkApplied.current) return
    const code = initialComplianceTypeCode?.trim().toUpperCase()
    if (!code || items.length === 0) return
    const match = items.find((i) => (i.code ?? '').toUpperCase() === code)
    if (!match) return
    deepLinkApplied.current = true
    setEditingTypeId(match.complianceTypeId)
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-testid="compliance-item-${match.code ?? match.complianceTypeId}"]`,
      )
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [initialComplianceTypeCode, items])

  const visibleItems = React.useMemo(
    () =>
      filterComplianceChecklistItems(items, {
        statusFilter,
        versionFilter,
        hideNoLongerRequired,
      }),
    [hideNoLongerRequired, items, statusFilter, versionFilter],
  )

  const hasDbsRow = React.useMemo(
    () => visibleItems.some(item => item.code === 'DBS_CODE'),
    [visibleItems],
  )

  const editingItem = React.useMemo(
    () => items.find(i => i.complianceTypeId === editingTypeId) ?? null,
    [editingTypeId, items],
  )

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

  const canEdit = canUpdate || canCreate || canUpload
  const showRowActions = canEdit || canDownload || canDeleteDoc

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
          Use Edit to open the side sheet for notes, dates, DBS details, and uploads. The newest file is Current; older
          files stay listed as Previous.
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

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[12rem] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Work area</label>
          <Input value={workAreaName} readOnly className="h-9 bg-muted/30" />
        </div>
        <div className="min-w-[12rem] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as ComplianceStatusFilter)}>
            <SelectTrigger className="h-9 w-[12rem]" data-testid="compliance-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {COMPLIANCE_STATUS_FILTER_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[12rem] space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Document version</label>
          <Select
            value={versionFilter}
            onValueChange={v => setVersionFilter(v as ComplianceDocumentVersionFilter)}
          >
            <SelectTrigger className="h-9 w-[12rem]" data-testid="compliance-version-filter">
              <SelectValue placeholder="Version" />
            </SelectTrigger>
            <SelectContent>
              {COMPLIANCE_DOCUMENT_VERSION_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <Switch checked={hideNoLongerRequired} onCheckedChange={setHideNoLongerRequired} />
          Hide no longer required
        </label>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading compliance checklist…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No compliance items are required for this employee&apos;s work area. Assign a work area on the Employment tab
          and re-open this page.
        </p>
      ) : null}

      {!loading && items.length > 0 && visibleItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No compliance items match the selected filters.</p>
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
                <th className="px-3 py-2 font-medium">Status</th>
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
                const row = item.record
                const parsed = parseComplianceNotes(row?.notes, item.code)
                const isDbsCode = item.code === 'DBS_CODE'
                const docs = sortDocsNewestFirst(row?.documents ?? [])
                const { current: currentDoc, previous: previousDocs } = docsForVersionFilter(docs, versionFilter)
                const startDate = complianceIsoToDateInput(row?.issueDate)
                const expiryDate = complianceIsoToDateInput(row?.expiryDate)
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
                    <td className="px-3 py-2">{statusBadge(item)}</td>
                    {hasDbsRow ? (
                      <td className="px-3 py-2">
                        {isDbsCode ? (
                          <span className="text-sm">{parsed.dbsCode || '—'}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ) : null}
                    {hasDbsRow ? (
                      <td className="px-3 py-2">
                        {isDbsCode ? (
                          <span className="text-sm">{parsed.transferable ? 'Yes' : 'No'}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      <div className="min-w-[18rem] space-y-1">
                        {!currentDoc && previousDocs.length === 0 ? (
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
                                <span
                                  className="truncate text-xs font-medium text-foreground"
                                  title={currentDoc.originalName || currentDoc.fileName}
                                >
                                  {currentDoc.originalName || currentDoc.fileName}
                                </span>
                              </div>
                              <p className="pl-0.5 text-[11px] text-muted-foreground">
                                {formatDate(currentDoc.uploadedAt) || '—'} ·{' '}
                                {formatComplianceUploaderLabel(currentDoc.uploadedBy)}
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
                                  {formatDate(doc.uploadedAt) || '—'} · {formatComplianceUploaderLabel(doc.uploadedBy)}
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
                                    disabled={fileBusy}
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
                                    disabled={fileBusy}
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
                                    disabled={deleteDocMutation.isPending}
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
                      <span className="text-sm">{parsed.userNotes || '—'}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {startDate ? formatDate(`${startDate}T12:00:00.000Z`) || startDate : '—'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {expiryDate ? formatDate(`${expiryDate}T12:00:00.000Z`) || expiryDate : '—'}
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
                              disabled={!currentDoc || currentBusy}
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
                              disabled={!currentDoc || currentBusy}
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
                              disabled={!currentDoc || deleteDocMutation.isPending}
                              onClick={() => currentDoc && onRemoveDocument(item, currentDoc)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canEdit ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              title="Edit"
                              aria-label={`Edit ${item.name}`}
                              data-testid={`compliance-edit-${item.code ?? item.complianceTypeId}`}
                              onClick={() => setEditingTypeId(item.complianceTypeId)}
                            >
                              <Pencil className="h-4 w-4" />
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

      <EmployeeComplianceEditSheet
        open={Boolean(editingTypeId)}
        onOpenChange={open => {
          if (!open) setEditingTypeId(null)
        }}
        employeeId={employeeId}
        item={editingItem}
        canCreate={canCreate}
        canUpdate={canUpdate}
        canUpload={canUpload}
        canDownload={canDownload}
        canDeleteDoc={canDeleteDoc}
        onBanner={setBanner}
      />
    </div>
  )
}
