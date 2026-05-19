import * as React from 'react'
import { FileUp, Upload } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { getApiBaseUrl } from '@/lib/api-base'
import { useAuthStore } from '@/store/auth.store'
import {
  complianceIsoToDateInput,
  complianceDatesToPayload,
  createEmployeeCompliance,
  deleteComplianceDocument,
  downloadComplianceDocument,
  ensureEmployeeComplianceChecklist,
  fetchComplianceChecklist,
  updateEmployeeCompliance,
  uploadComplianceDocument,
  type ComplianceChecklistItem,
  type EmployeeComplianceRow,
} from '@/lib/employee-compliance-api'
import { parseComplianceNotes, serializeComplianceNotes } from '@/lib/compliance-dbs-notes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/toggle-controls'
import { cn } from '@/lib/utils'

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

export function EmployeeEditCompliancePanel({ employeeId }: { employeeId: string }) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canRead = useAuthStore(s => s.can('employees.compliance.read'))
  const canCreate = useAuthStore(s => s.can('employees.compliance.create'))
  const canUpdate = useAuthStore(s => s.can('employees.compliance.update'))
  const canUpload = useAuthStore(s => s.can('employees.compliance.documents.upload'))
  const canDownload = useAuthStore(s => s.can('employees.compliance.documents.download'))

  const [workAreaName, setWorkAreaName] = React.useState('—')
  const [items, setItems] = React.useState<ComplianceChecklistItem[]>([])
  const [drafts, setDrafts] = React.useState<Record<string, ItemDraft>>({})
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hideNoLongerRequired, setHideNoLongerRequired] = React.useState(true)
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [uploadingKey, setUploadingKey] = React.useState<string | null>(null)

  const applyChecklist = React.useCallback((data: { workAreaName: string | null; items: ComplianceChecklistItem[] }) => {
    setWorkAreaName(data.workAreaName ?? '—')
    setItems(data.items)
    const next: Record<string, ItemDraft> = {}
    for (const item of data.items) {
      next[item.complianceTypeId] = draftFromItem(item)
    }
    setDrafts(next)
  }, [])

  const load = React.useCallback(async () => {
    if (!employeeId || !apiConfigured || !jwtPresent || !canRead) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = canCreate
        ? await ensureEmployeeComplianceChecklist(employeeId)
        : await fetchComplianceChecklist(employeeId)
      applyChecklist(data)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load compliance checklist.')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [apiConfigured, applyChecklist, canCreate, canRead, employeeId, jwtPresent])

  React.useEffect(() => {
    void load()
  }, [load])

  const visibleItems = React.useMemo(
    () =>
      hideNoLongerRequired
        ? items.filter(i => !i.record?.isNoLongerRequired)
        : items,
    [hideNoLongerRequired, items],
  )

  const setDraft = (typeId: string, patch: Partial<ItemDraft>) => {
    setDrafts(prev => ({ ...prev, [typeId]: { ...prev[typeId], ...patch } }))
  }

  const ensureRecord = async (item: ComplianceChecklistItem): Promise<EmployeeComplianceRow> => {
    if (item.record) return item.record
    if (!canCreate) throw new ApiError('You cannot create compliance records.', 403)
    return createEmployeeCompliance(employeeId, {
      complianceTypeId: item.complianceTypeId,
      requirementId: item.requirementId ?? undefined,
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
      await updateEmployeeCompliance(employeeId, row.id, {
        ...complianceDatesToPayload(d.issueDate, d.expiryDate),
        notes,
      })
      await load()
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
      await uploadComplianceDocument(employeeId, row.id, file)
      await load()
      setBanner({ type: 'success', text: 'Document uploaded.' })
    } catch (e) {
      setBanner({ type: 'error', text: e instanceof ApiError ? e.message : 'Upload failed.' })
    } finally {
      setUploadingKey(null)
    }
  }

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
      <h2 className="text-sm font-semibold text-foreground">Compliance Document</h2>

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

      {!loading ? (
        <div className="space-y-6">
          {visibleItems.map(item => {
            const d = drafts[item.complianceTypeId] ?? draftFromItem(item)
            const row = item.record
            const isDbsCode = item.code === 'DBS_CODE'
            const busy = savingKey === item.complianceTypeId || uploadingKey === item.complianceTypeId
            const primaryDoc = row?.documents[0]

            return (
              <div
                key={item.complianceTypeId}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
                data-testid={`compliance-item-${item.code ?? item.complianceTypeId}`}
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  {item.name}
                  {item.isMandatory ? (
                    <span className="ml-0.5 text-destructive" title="Required">
                      *
                    </span>
                  ) : null}
                </p>

                {isDbsCode ? (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">DBS Code</label>
                      <Input
                        className="h-9"
                        value={d.dbsCode}
                        disabled={busy || (!canUpdate && !canCreate)}
                        placeholder="e.g. 001840292079"
                        onChange={e => setDraft(item.complianceTypeId, { dbsCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">DBS Transferrable</label>
                      <label className="flex h-9 items-center gap-2 text-sm">
                        <Switch
                          checked={d.transferable}
                          disabled={busy || (!canUpdate && !canCreate)}
                          onCheckedChange={v => setDraft(item.complianceTypeId, { transferable: v })}
                        />
                        {d.transferable ? 'Yes' : 'No'}
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4">
                  {canUpload ? (
                    <label
                      className={cn(
                        'flex min-h-[5.5rem] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/20 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40',
                        busy && 'pointer-events-none opacity-60',
                      )}
                    >
                      <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {uploadingKey === item.complianceTypeId ? 'Uploading…' : 'Drop files here to upload'}
                      </span>
                      {primaryDoc ? (
                        <span className="mt-2 text-xs font-medium text-foreground">{primaryDoc.originalName}</span>
                      ) : null}
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
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                      {primaryDoc?.originalName ?? 'No document uploaded'}
                    </div>
                  )}

                  {row && row.documents.length > 1 ? (
                    <ul className="mt-2 space-y-1 text-xs">
                      {row.documents.slice(1).map(doc => (
                        <li key={doc.id} className="flex items-center gap-2">
                          {canDownload ? (
                            <button
                              type="button"
                              className="truncate text-primary hover:underline"
                              onClick={() =>
                                void downloadComplianceDocument(
                                  employeeId,
                                  row.id,
                                  doc.id,
                                  doc.originalName || doc.fileName,
                                )
                              }
                            >
                              {doc.originalName || doc.fileName}
                            </button>
                          ) : (
                            <span>{doc.originalName}</span>
                          )}
                          {canUpdate ? (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                if (!window.confirm('Delete this file?')) return
                                void deleteComplianceDocument(employeeId, row.id, doc.id).then(() => load())
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {primaryDoc && canDownload ? (
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      onClick={() =>
                        void downloadComplianceDocument(
                          employeeId,
                          row!.id,
                          primaryDoc.id,
                          primaryDoc.originalName || primaryDoc.fileName,
                        )
                      }
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Download {primaryDoc.originalName}
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem_auto]">
                  <div className="min-w-0 space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Notes</label>
                    <Input
                      className="h-9"
                      value={d.notes}
                      disabled={busy || (!canUpdate && !canCreate)}
                      onChange={e => setDraft(item.complianceTypeId, { notes: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Start Date</label>
                    <Input
                      type="date"
                      className="h-9 w-full"
                      value={d.issueDate}
                      disabled={busy || (!canUpdate && !canCreate)}
                      onChange={e => setDraft(item.complianceTypeId, { issueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Expiry Date</label>
                    <Input
                      type="date"
                      className="h-9 w-full"
                      value={d.expiryDate}
                      disabled={busy || (!canUpdate && !canCreate)}
                      onChange={e => setDraft(item.complianceTypeId, { expiryDate: e.target.value })}
                    />
                  </div>
                  {(canUpdate || canCreate) && (
                    <div className="shrink-0 pb-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-9"
                        disabled={busy}
                        onClick={() => void onSaveItem(item)}
                      >
                        {savingKey === item.complianceTypeId ? 'Saving…' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
