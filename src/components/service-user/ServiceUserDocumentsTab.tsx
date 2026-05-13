import * as React from 'react'
import { Info, Loader2, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api-client'
import { toastApiError, toastSuccess } from '@/lib/toast'
import { resolveMediaUrl } from '@/lib/media-url'
import {
  createServiceUserDolsRecord,
  deleteServiceUserDolsRecord,
  fetchServiceUserDocuments,
  patchServiceUserLegalDocuments,
  updateServiceUserDolsRecord,
  uploadServiceUserDnacprCertificate,
  uploadServiceUserDolsCertificate,
  uploadServiceUserLpaFinanceCertificate,
  uploadServiceUserLpaHealthCertificate,
  type ServiceUserDolsRow,
  type ServiceUserDocumentsBundle,
  type ServiceUserLegalDocuments,
} from '@/lib/service-users-api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/toggle-controls'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

function formatDisplayDate(iso: string | null): string {
  if (!iso) return '—'
  return iso
}

type DolsForm = {
  applicationDate: string
  issueDate: string
  renewalDate: string
  isCurrent: boolean
  reportedToChc: boolean
  notes: string
}

function emptyDolsForm(): DolsForm {
  return {
    applicationDate: '',
    issueDate: '',
    renewalDate: '',
    isCurrent: false,
    reportedToChc: false,
    notes: '',
  }
}

function rowToDolsForm(row: ServiceUserDolsRow): DolsForm {
  return {
    applicationDate: row.applicationDate ?? '',
    issueDate: row.issueDate ?? '',
    renewalDate: row.renewalDate ?? '',
    isCurrent: row.isCurrent,
    reportedToChc: row.reportedToChc,
    notes: row.notes ?? '',
  }
}

export function ServiceUserDocumentsTab({ serviceUserId }: { serviceUserId: string }) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.documents.read') || can('service_users.read')
  const canUpdate = can('service_users.documents.update') || can('service_users.update')
  const canDelete = can('service_users.documents.delete') || can('service_users.delete')

  const [bundle, setBundle] = React.useState<ServiceUserDocumentsBundle | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [legalSaving, setLegalSaving] = React.useState(false)

  const dnacprFileRef = React.useRef<HTMLInputElement>(null)
  const lpaHealthRef = React.useRef<HTMLInputElement>(null)
  const lpaFinanceRef = React.useRef<HTMLInputElement>(null)

  const [dolsDialogOpen, setDolsDialogOpen] = React.useState(false)
  const [dolsEditingId, setDolsEditingId] = React.useState<string | null>(null)
  const [dolsForm, setDolsForm] = React.useState<DolsForm>(() => emptyDolsForm())
  const [dolsFormError, setDolsFormError] = React.useState<string | null>(null)
  const [dolsSaving, setDolsSaving] = React.useState(false)
  const dolsCertRef = React.useRef<HTMLInputElement>(null)
  const [pendingCertFile, setPendingCertFile] = React.useState<File | null>(null)

  const [deleteDolsId, setDeleteDolsId] = React.useState<string | null>(null)
  const [deleteSaving, setDeleteSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    if (!canRead) {
      setBundle(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchServiceUserDocuments(serviceUserId)
      setBundle(data)
    } catch (e) {
      setBundle(null)
      setError(e instanceof ApiError ? e.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [canRead, serviceUserId])

  React.useEffect(() => {
    void load()
  }, [load])

  const legal = bundle?.legal

  async function refreshLegal(next: ServiceUserLegalDocuments) {
    setBundle((b) => {
      if (!b) return { legal: next, dols: [] }
      return { ...b, legal: next }
    })
  }

  async function onPatchLegal(patch: { dnacprInPlace?: boolean; dnacprStartDate?: string | null }) {
    if (!canUpdate) return
    setLegalSaving(true)
    try {
      const updated = await patchServiceUserLegalDocuments(serviceUserId, patch)
      await refreshLegal(updated)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Could not update legal details')
    } finally {
      setLegalSaving(false)
    }
  }

  async function onPickDnacprCert(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canUpdate) return
    setLegalSaving(true)
    try {
      const updated = await uploadServiceUserDnacprCertificate(serviceUserId, file)
      await refreshLegal(updated)
      toastSuccess('DNACPR certificate uploaded')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
      toastApiError(err, 'Upload failed')
    } finally {
      setLegalSaving(false)
    }
  }

  async function onPickLpa(kind: 'health' | 'finance', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !canUpdate) return
    setLegalSaving(true)
    try {
      const updated =
        kind === 'health'
          ? await uploadServiceUserLpaHealthCertificate(serviceUserId, file)
          : await uploadServiceUserLpaFinanceCertificate(serviceUserId, file)
      await refreshLegal(updated)
      toastSuccess(
        kind === 'health' ? 'LPA health certificate uploaded' : 'LPA finance certificate uploaded',
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed')
      toastApiError(err, 'Upload failed')
    } finally {
      setLegalSaving(false)
    }
  }

  function openAddDols() {
    setDolsEditingId(null)
    setDolsForm(emptyDolsForm())
    setDolsFormError(null)
    setPendingCertFile(null)
    setDolsDialogOpen(true)
  }

  function openEditDols(row: ServiceUserDolsRow) {
    setDolsEditingId(row.id)
    setDolsForm(rowToDolsForm(row))
    setDolsFormError(null)
    setPendingCertFile(null)
    setDolsDialogOpen(true)
  }

  async function saveDols() {
    if (!canUpdate) return
    setDolsSaving(true)
    setDolsFormError(null)
    try {
      const body = {
        applicationDate: dolsForm.applicationDate.trim() || undefined,
        issueDate: dolsForm.issueDate.trim() || undefined,
        renewalDate: dolsForm.renewalDate.trim() || undefined,
        isCurrent: dolsForm.isCurrent,
        reportedToChc: dolsForm.reportedToChc,
        notes: dolsForm.notes.trim(),
      }
      let row: ServiceUserDolsRow
      if (dolsEditingId) {
        row = await updateServiceUserDolsRecord(serviceUserId, dolsEditingId, body)
      } else {
        row = await createServiceUserDolsRecord(serviceUserId, body)
      }
      if (pendingCertFile) {
        row = await uploadServiceUserDolsCertificate(serviceUserId, row.id, pendingCertFile)
      }
      setDolsDialogOpen(false)
      await load()
      toastSuccess(dolsEditingId ? 'DoLS record updated' : 'DoLS record added', 'Documents have been saved.')
    } catch (e) {
      setDolsFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Could not save DoLS record')
    } finally {
      setDolsSaving(false)
    }
  }

  async function confirmDeleteDols() {
    if (!deleteDolsId) return
    setDeleteSaving(true)
    try {
      await deleteServiceUserDolsRecord(serviceUserId, deleteDolsId)
      setDeleteDolsId(null)
      await load()
      toastSuccess('DoLS record removed')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed')
      toastApiError(e, 'Delete failed')
    } finally {
      setDeleteSaving(false)
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
        You do not have permission to view documents. Ask an administrator to grant{' '}
        <span className="font-mono text-xs">service_users.read</span> or{' '}
        <span className="font-mono text-xs">service_users.documents.read</span>.
      </div>
    )
  }

  return (
    <section className="space-y-8">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading || !legal ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">
              Do not attempt Cardio-Pulmonary Resuscitation (DNACPR) Details
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Is there a DNACPR?</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={legal.dnacprInPlace}
                    disabled={!canUpdate || legalSaving}
                    onCheckedChange={(v) => void onPatchLegal({ dnacprInPlace: v })}
                    className={cn(
                      legal.dnacprInPlace && 'data-[state=checked]:bg-red-600 data-[state=checked]:hover:bg-red-700',
                    )}
                  />
                  <span className={cn('text-sm font-medium', legal.dnacprInPlace ? 'text-red-600' : 'text-muted-foreground')}>
                    {legal.dnacprInPlace ? 'YES' : 'NO'}
                  </span>
                </div>
              </div>
              {legal.dnacprInPlace && (
                <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-start">
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md">
                    <span className="text-xs font-medium text-muted-foreground">Upload DNACPR Cert</span>
                    <div className="flex gap-2">
                      <input
                        ref={dnacprFileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="sr-only"
                        onChange={onPickDnacprCert}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="shrink-0 bg-teal-800 text-white hover:bg-teal-900"
                        disabled={!canUpdate || legalSaving}
                        onClick={() => dnacprFileRef.current?.click()}
                      >
                        Browse…
                      </Button>
                      <span className="min-w-0 flex-1 truncate rounded-md border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground">
                        {legal.dnacprCertificateUrl ? 'Certificate on file' : 'No file selected'}
                      </span>
                    </div>
                    {legal.dnacprCertificateUrl && (
                      <a
                        href={resolveMediaUrl(legal.dnacprCertificateUrl) ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-600 underline hover:text-sky-700"
                      >
                        View current certificate
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 sm:w-56">
                    <span className="text-xs font-medium text-muted-foreground">DNACPR start date</span>
                    <Input
                      type="date"
                      disabled={!canUpdate || legalSaving}
                      value={legal.dnacprStartDate ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        void onPatchLegal({ dnacprStartDate: v ? v : null })
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">
              Lasting power of attorney (LPA) Details
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Upload Cert Health</span>
                <div className="flex gap-2">
                  <input
                    ref={lpaHealthRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    onChange={(e) => void onPickLpa('health', e)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="bg-teal-800 text-white hover:bg-teal-900"
                    disabled={!canUpdate || legalSaving}
                    onClick={() => lpaHealthRef.current?.click()}
                  >
                    Browse…
                  </Button>
                  <span className="min-w-0 flex-1 truncate rounded-md border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground">
                    {legal.lpaHealthCertificateUrl ? 'File on file' : 'No file selected'}
                  </span>
                </div>
                {legal.lpaHealthCertificateUrl && (
                  <a
                    href={resolveMediaUrl(legal.lpaHealthCertificateUrl) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-600 underline"
                  >
                    View
                  </a>
                )}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Upload Cert Finance</span>
                <div className="flex gap-2">
                  <input
                    ref={lpaFinanceRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    onChange={(e) => void onPickLpa('finance', e)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="bg-teal-800 text-white hover:bg-teal-900"
                    disabled={!canUpdate || legalSaving}
                    onClick={() => lpaFinanceRef.current?.click()}
                  >
                    Browse…
                  </Button>
                  <span className="min-w-0 flex-1 truncate rounded-md border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground">
                    {legal.lpaFinanceCertificateUrl ? 'File on file' : 'No file selected'}
                  </span>
                </div>
                {legal.lpaFinanceCertificateUrl && (
                  <a
                    href={resolveMediaUrl(legal.lpaFinanceCertificateUrl) ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-sky-600 underline"
                  >
                    View
                  </a>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-sky-600 dark:text-sky-400">
                Deprivation of Liberty Safeguard (DoLS)
              </h2>
              {canUpdate && (
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 underline hover:text-red-700"
                  onClick={openAddDols}
                >
                  Add a new DoLS
                </button>
              )}
            </div>

            {bundle.dols.length === 0 ? (
              <p className="text-sm text-muted-foreground">No record exists.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Application Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Issue Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Expiry Date</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Comment</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Reported to CHC/Commissioner</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">File</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.dols.map((row) => (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="whitespace-nowrap px-3 py-2 align-top">{formatDisplayDate(row.applicationDate)}</td>
                        <td className="whitespace-nowrap px-3 py-2 align-top">{formatDisplayDate(row.issueDate)}</td>
                        <td className="whitespace-nowrap px-3 py-2 align-top">{formatDisplayDate(row.renewalDate)}</td>
                        <td className="px-3 py-2 align-top">{row.isCurrent ? 'Current' : '—'}</td>
                        <td className="max-w-[12rem] px-3 py-2 align-top">
                          <span className="line-clamp-3 whitespace-pre-wrap">{row.notes || '—'}</span>
                        </td>
                        <td className="px-3 py-2 align-top">{row.reportedToChc ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2 align-top">
                          {row.certificateUrl ? (
                            <a
                              href={resolveMediaUrl(row.certificateUrl) ?? '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-600 underline"
                            >
                              Open
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2 text-right align-top">
                          <div className="inline-flex gap-1">
                            {canUpdate && (
                              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditDols(row)}>
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            )}
                            {canDelete && (
                              <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setDeleteDolsId(row.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <Dialog open={dolsDialogOpen} onOpenChange={setDolsDialogOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sky-600">
              {dolsEditingId ? 'Edit Deprivation of Liberty Safeguard (DoLS)' : 'Add Deprivation of Liberty Safeguard (DoLS)'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {dolsFormError && <p className="text-sm text-destructive">{dolsFormError}</p>}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">DoLS Application Date</label>
                <Input
                  type="date"
                  value={dolsForm.applicationDate}
                  onChange={(e) => setDolsForm((f) => ({ ...f, applicationDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">DoLS Issue Date</label>
                <Input type="date" value={dolsForm.issueDate} onChange={(e) => setDolsForm((f) => ({ ...f, issueDate: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">DoLS Renewal Date</label>
                <Input
                  type="date"
                  value={dolsForm.renewalDate}
                  onChange={(e) => setDolsForm((f) => ({ ...f, renewalDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={dolsForm.isCurrent}
                  onCheckedChange={(v) => setDolsForm((f) => ({ ...f, isCurrent: v }))}
                  id="dols-current"
                />
                <label htmlFor="dols-current" className="text-sm text-muted-foreground">
                  Status: Current
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={dolsForm.reportedToChc}
                  onCheckedChange={(v) => setDolsForm((f) => ({ ...f, reportedToChc: v }))}
                  id="dols-chc"
                />
                <label htmlFor="dols-chc" className="text-sm text-muted-foreground">
                  Reported to CHC: {dolsForm.reportedToChc ? 'YES' : 'NO'}
                </label>
                <span title="Record whether this authorisation was reported to the commissioner / CHC." className="text-sky-600">
                  <Info className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                value={dolsForm.notes}
                onChange={(e) => setDolsForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Upload DoLS Cert</span>
              <div className="flex gap-2">
                <input
                  ref={dolsCertRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    e.target.value = ''
                    setPendingCertFile(f)
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  className="bg-teal-800 text-white hover:bg-teal-900"
                  onClick={() => dolsCertRef.current?.click()}
                >
                  Browse…
                </Button>
                <span className="min-w-0 flex-1 truncate rounded-md border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground">
                  {pendingCertFile ? pendingCertFile.name : 'No file selected'}
                </span>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDolsDialogOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              className="bg-sky-600 text-white hover:bg-sky-700"
              disabled={!canUpdate || dolsSaving}
              onClick={() => void saveDols()}
            >
              {dolsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteDolsId)} onOpenChange={(o) => !o && setDeleteDolsId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove DoLS record?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDeleteDols()} disabled={deleteSaving}>
              {deleteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
