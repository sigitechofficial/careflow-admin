import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { getApiBaseUrl } from '@/shared/lib/api-base'
import { resolveMediaUrl } from '@/shared/lib/media-url'
import { useAuthStore } from '@/features/auth/store'
import { uploadEmployeeDocument, type EmployeeCertificationRow } from '@/features/employees/api'
import {
  useCreateEmployeeCertification,
  useDeleteEmployeeCertification,
} from '@/features/employees/hooks/useEmployeeMutations'
import { useEmployeeLookups } from '@/features/employees/hooks/useEmployees'
import { useEmployeeCertifications } from '@/features/employees/hooks/useEmployeeTabs'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Combobox } from '@/shared/ui/combobox'
import { formatDate } from '@/shared/lib/utils'

const CERT_ACCEPT =
  'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function toNoonIso(date: string): string | undefined {
  const trimmed = date.trim()
  return trimmed ? `${trimmed}T12:00:00.000Z` : undefined
}

export function EmployeeEditCertificationsPanel({
  employeeId,
  showHeading = true,
}: {
  employeeId: string
  showHeading?: boolean
}) {
  const apiConfigured = Boolean(getApiBaseUrl())
  const accessToken = useAuthStore(s => s.accessToken)
  const jwtPresent = Boolean(accessToken?.includes('.'))
  const canUpdate = useAuthStore(s => s.can('employees.update'))
  const canUploadDocs = useAuthStore(s => s.can('employees.documents.upload'))
  const queryEnabled = apiConfigured && jwtPresent && Boolean(employeeId)

  const lookupsQuery = useEmployeeLookups(queryEnabled)
  const certsQuery = useEmployeeCertifications(employeeId, queryEnabled)
  const createMutation = useCreateEmployeeCertification(employeeId)
  const deleteMutation = useDeleteEmployeeCertification(employeeId)

  const lookups = lookupsQuery.data ?? null
  const certifications = certsQuery.data ?? []
  const loading = certsQuery.isLoading
  const error =
    certsQuery.error instanceof ApiError
      ? certsQuery.error.message
      : certsQuery.error
        ? 'Could not load work certifications.'
        : null

  const [certificationTypeId, setCertificationTypeId] = React.useState('')
  const [reference, setReference] = React.useState('')
  const [issueDate, setIssueDate] = React.useState('')
  const [expiryDate, setExpiryDate] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [file, setFile] = React.useState<File | null>(null)
  const [banner, setBanner] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const saving = createMutation.isPending

  const certTypeOptions = lookups?.certificationTypes ?? []

  const resetForm = () => {
    setCertificationTypeId('')
    setReference('')
    setIssueDate('')
    setExpiryDate('')
    setNotes('')
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onAdd = async () => {
    if (!certificationTypeId.trim()) {
      setBanner({ type: 'error', text: 'Select a certificate.' })
      return
    }
    setBanner(null)
    try {
      let certificateUrl: string | undefined
      if (file) {
        if (!canUploadDocs) {
          setBanner({
            type: 'error',
            text: 'You do not have permission to upload certificate files.',
          })
          return
        }
        const uploaded = await uploadEmployeeDocument(employeeId, file, {
          name: file.name,
          description: 'Work certification',
        })
        certificateUrl = uploaded.fileUrl
      }
      const body: {
        certificationTypeId: string
        reference?: string
        issueDate?: string
        expiryDate?: string
        notes?: string
        certificateUrl?: string
      } = { certificationTypeId: certificationTypeId.trim() }
      if (reference.trim()) body.reference = reference.trim()
      const issued = toNoonIso(issueDate)
      if (issued) body.issueDate = issued
      const expires = toNoonIso(expiryDate)
      if (expires) body.expiryDate = expires
      if (notes.trim()) body.notes = notes.trim()
      if (certificateUrl) body.certificateUrl = certificateUrl
      await createMutation.mutateAsync(body)
      resetForm()
      setBanner({ type: 'success', text: 'Work certification added.' })
    } catch (e) {
      setBanner({
        type: 'error',
        text: e instanceof ApiError ? e.message : 'Could not add work certification.',
      })
    }
  }

  const onDelete = async (certificationId: string) => {
    if (!window.confirm('Remove this work certification from the employee?')) return
    setBanner(null)
    try {
      await deleteMutation.mutateAsync(certificationId)
      setBanner({ type: 'success', text: 'Work certification removed.' })
    } catch (e) {
      setBanner({
        type: 'error',
        text: e instanceof ApiError ? e.message : 'Could not remove work certification.',
      })
    }
  }

  return (
    <div className="space-y-4" data-testid="employee-edit-certifications-panel">
      {showHeading ? (
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Work Certification</h2>
          {canUpdate ? (
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </span>
          ) : null}
        </div>
      ) : null}
      {banner ? (
        <div
          role="status"
          className={
            banner.type === 'success'
              ? 'rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900'
              : 'rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive'
          }
        >
          {banner.text}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading work certifications…</p> : null}
      {!loading ? (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Work Certification</th>
                <th className="px-3 py-2 font-medium">Reference</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Issue Date</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Expiry Date</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                <th className="px-3 py-2 font-medium">Certificate</th>
                {canUpdate ? <th className="w-12 px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {certifications.length === 0 ? (
                <tr>
                  <td colSpan={canUpdate ? 7 : 6} className="px-3 py-8 text-center text-muted-foreground">
                    No work certifications recorded yet.
                  </td>
                </tr>
              ) : (
                certifications.map((row: EmployeeCertificationRow) => {
                  const href = resolveMediaUrl(row.certificateUrl)
                  return (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{row.certificationType?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.reference?.trim() ? row.reference : '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(row.issueDate)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(row.expiryDate)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.notes?.trim() ? row.notes : '—'}</td>
                      <td className="px-3 py-2">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {canUpdate ? (
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            title="Remove work certification"
                            className="inline-flex rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => void onDelete(row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
      {canUpdate ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 space-y-3">
          <p className="text-xs font-medium text-foreground">Add work certification</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Certificate</label>
              <Combobox
                options={certTypeOptions.map(t => ({ value: t.id, label: t.name }))}
                value={certificationTypeId}
                onChange={setCertificationTypeId}
                placeholder={
                  certTypeOptions.length ? 'Select certificate' : 'No certificate types configured'
                }
                searchPlaceholder="Search certificates…"
                emptyText="No matching certificates."
                allowDeselect
                aria-label="Certificate"
                data-testid="employee-certification-type-picker"
              />
              <p className="text-[11px] text-muted-foreground">
                Qualification list from Settings → Certifications. The same list is used everywhere.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Reference (optional)</label>
              <Input value={reference} onChange={e => setReference(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Issue date (optional)</label>
              <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Expiry date (optional)</label>
              <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Certificate file (optional)</label>
              <Input
                ref={fileRef}
                type="file"
                accept={CERT_ACCEPT}
                className="h-9"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Notes (optional)</label>
              <Input value={notes} onChange={e => setNotes(e.target.value)} className="h-9" />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={saving || !certificationTypeId.trim()}
            onClick={() => void onAdd()}
          >
            {saving ? 'Saving…' : 'Add certification'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
