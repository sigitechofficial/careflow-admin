import * as React from 'react'
import { Loader2, Trash2, Upload } from 'lucide-react'
import { ApiError } from '@/lib/api-client'
import { toastApiError, toastError, toastSuccess } from '@/lib/toast'
import {
  addServiceUserLiveInBlockedCarer,
  addServiceUserLiveInPreferredCarer,
  createServiceUserLiveInProfile,
  deleteServiceUserLiveInContract,
  deleteServiceUserLiveInProfile,
  downloadServiceUserLiveInContract,
  fetchLiveInLookupsBundle,
  fetchServiceUserLiveInProfile,
  patchServiceUserLiveInProfile,
  patchServiceUserLiveInProfileStatus,
  removeServiceUserLiveInBlockedCarer,
  removeServiceUserLiveInPreferredCarer,
  searchServiceUserDomCareEmployees,
  uploadServiceUserLiveInContract,
  type LiveInCarerLink,
  type LiveInLookupsBundle,
  type LiveInProfileStatus,
  type ServiceUserDetailContact,
  type ServiceUserDomCareCarerBrief,
  type ServiceUserLiveInProfileDetail,
} from '@/lib/service-users-api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function sectionClass() {
  return 'rounded-xl border border-border bg-card p-6 shadow-sm'
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-sm font-semibold text-sky-600 dark:text-sky-400">{children}</h2>
}

function carerLabel(row: LiveInCarerLink): string {
  const pd = row.employee?.personalDetail
  if (pd) return `${pd.firstName} ${pd.lastName}`.trim()
  return row.employeeId
}

function isoDateInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return iso.slice(0, 10)
}

function normalizeLookupsBundle(lu: LiveInLookupsBundle): LiveInLookupsBundle {
  return {
    serviceTypes: lu.serviceTypes ?? [],
    levelsOfCare: lu.levelsOfCare ?? [],
    scanTypes: lu.scanTypes ?? [],
  }
}

function normalizeLiveInProfile(p: ServiceUserLiveInProfileDetail): ServiceUserLiveInProfileDetail {
  return {
    ...p,
    preferredCarers: Array.isArray(p.preferredCarers) ? p.preferredCarers : [],
    blockedCarers: Array.isArray(p.blockedCarers) ? p.blockedCarers : [],
    contractDocuments: Array.isArray(p.contractDocuments) ? p.contractDocuments : [],
  }
}

const STATUS_OPTIONS: LiveInProfileStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ENDED', 'CANCELLED']

const areaCls =
  'min-h-[100px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

const selectCls =
  'h-10 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

type EmployeeSearchMiniProps = {
  serviceUserId: string
  disabled: boolean
  excludeEmployeeIds: string[]
  onPick: (employeeId: string) => void
}

function EmployeeSearchMini({ serviceUserId, disabled, excludeEmployeeIds, onPick }: EmployeeSearchMiniProps) {
  const canSearch = useAuthStore(
    (s) => s.can('service_users.read') || s.can('service_users.dom_care.read'),
  )
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [hits, setHits] = React.useState<ServiceUserDomCareCarerBrief[]>([])
  const [loading, setLoading] = React.useState(false)
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const excludeKey = excludeEmployeeIds.slice().sort().join(',')

  React.useEffect(() => {
    if (!open || disabled || !canSearch) return
    const t = window.setTimeout(() => {
      void (async () => {
        setLoading(true)
        try {
          const rows = await searchServiceUserDomCareEmployees(serviceUserId, {
            search: q || undefined,
            limit: 15,
          })
          const ex = new Set(excludeEmployeeIds)
          setHits(rows.filter((r) => !ex.has(r.id)))
        } catch {
          setHits([])
        } finally {
          setLoading(false)
        }
      })()
    }, 280)
    return () => window.clearTimeout(t)
  }, [open, q, serviceUserId, disabled, canSearch, excludeKey])

  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current
      if (el && !el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  if (!canSearch) {
    return (
      <p className="text-xs text-muted-foreground">
        Employee search uses DOM care search — you need <span className="font-mono">service_users.read</span> or{' '}
        <span className="font-mono">service_users.dom_care.read</span>.
      </p>
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <Input
        placeholder="Search employee to add…"
        value={q}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
      />
      {open && !disabled && (
        <div
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border border-border bg-popover shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          ) : hits.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
          ) : (
            hits.map((h) => (
              <button
                key={h.id}
                type="button"
                className="flex w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onPick(h.id)
                  setQ('')
                  setOpen(false)
                }}
              >
                {h.firstName} {h.lastName}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function ServiceUserLiveInProfileTab({
  serviceUserId,
  contacts = [],
}: {
  serviceUserId: string
  contacts?: ServiceUserDetailContact[]
}) {
  const can = useAuthStore((s) => s.can)
  const canRead = can('service_users.live_in_profile.read') || can('service_users.read')
  const canCreate = can('service_users.live_in_profile.create') || can('service_users.create')
  const canUpdate = can('service_users.live_in_profile.update') || can('service_users.update')
  const canDelete = can('service_users.live_in_profile.delete') || can('service_users.delete')
  const canStatus = can('service_users.live_in_profile.status.update')
  const canCarers = can('service_users.live_in_profile.carers.manage') || canUpdate
  const canDocUp = can('service_users.live_in_profile.documents.upload') || canUpdate
  const canDocDl = can('service_users.live_in_profile.documents.download')
  const canDocDel = can('service_users.live_in_profile.documents.delete') || canUpdate

  const [lookups, setLookups] = React.useState<LiveInLookupsBundle | null>(null)
  const [profile, setProfile] = React.useState<ServiceUserLiveInProfileDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [statusDraft, setStatusDraft] = React.useState<LiveInProfileStatus>('DRAFT')
  const [statusReason, setStatusReason] = React.useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

  const load = React.useCallback(async () => {
    if (!canRead) {
      setProfile(null)
      setLookups(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [lu, p] = await Promise.all([fetchLiveInLookupsBundle(), fetchServiceUserLiveInProfile(serviceUserId)])
      setLookups(normalizeLookupsBundle(lu))
      setProfile(p ? normalizeLiveInProfile(p) : null)
      if (p) setStatusDraft(p.status)
    } catch (e) {
      setProfile(null)
      setLookups(null)
      setError(e instanceof ApiError ? e.message : 'Failed to load live-in profile')
    } finally {
      setLoading(false)
    }
  }, [canRead, serviceUserId])

  React.useEffect(() => {
    void load()
  }, [load])

  const setField = <K extends keyof ServiceUserLiveInProfileDetail>(key: K, value: ServiceUserLiveInProfileDetail[K]) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const onCreate = async () => {
    if (!canCreate) return
    setCreating(true)
    setError(null)
    try {
      const p = await createServiceUserLiveInProfile(serviceUserId, {})
      setProfile(normalizeLiveInProfile(p))
      setStatusDraft(p.status)
      toastSuccess('Live-in profile created', 'You can now edit details below.')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Create failed')
      toastApiError(e, 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const onSave = async () => {
    if (!profile || !canUpdate) return
    const n = Number(profile.numberOfCarers)
    if (!Number.isFinite(n) || n < 1 || n > 20) {
      toastError('Cannot save', 'Number of carers must be between 1 and 20.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const p = await patchServiceUserLiveInProfile(serviceUserId, {
        isLiveInEnabled: profile.isLiveInEnabled,
        isCustom: profile.isCustom,
        serviceTypeId: profile.serviceTypeId,
        residentContactId: profile.residentContactId,
        levelOfCareId: profile.levelOfCareId,
        scanTypeId: profile.scanTypeId,
        numberOfCarers: n,
        careInstructions: profile.careInstructions,
        startDate: profile.startDate ? profile.startDate.slice(0, 10) : null,
        endDate: profile.endDate ? profile.endDate.slice(0, 10) : null,
        reviewDate: profile.reviewDate ? profile.reviewDate.slice(0, 10) : null,
        status: profile.status,
        notes: profile.notes,
      })
      setProfile(normalizeLiveInProfile(p))
      setStatusDraft(p.status)
      toastSuccess('Saved', 'Live-in profile updated.')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const onStatusApply = async () => {
    if (!profile || !canStatus) return
    setSaving(true)
    setError(null)
    try {
      const p = await patchServiceUserLiveInProfileStatus(serviceUserId, {
        status: statusDraft,
        reason: statusReason.trim() || undefined,
      })
      setProfile(normalizeLiveInProfile(p))
      setStatusDraft(p.status)
      setStatusReason('')
      toastSuccess('Status updated', '')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Status update failed')
      toastApiError(e, 'Status update failed')
    } finally {
      setSaving(false)
    }
  }

  const onDeleteProfile = async () => {
    if (!profile || !canDelete) return
    if (!window.confirm('Soft-delete this live-in profile? Preferred/blocked lists will be cleared.')) return
    setSaving(true)
    setError(null)
    try {
      await deleteServiceUserLiveInProfile(serviceUserId)
      setProfile(null)
      toastSuccess('Deleted', 'Live-in profile removed.')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Delete failed')
      toastApiError(e, 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

  const refreshProfile = async () => {
    const p = await fetchServiceUserLiveInProfile(serviceUserId)
    setProfile(p ? normalizeLiveInProfile(p) : null)
    if (p) setStatusDraft(p.status)
  }

  const onAddPreferred = async (employeeId: string) => {
    if (!canCarers) return
    try {
      await addServiceUserLiveInPreferredCarer(serviceUserId, { employeeId })
      await refreshProfile()
      toastSuccess('Added', 'Preferred carer added.')
    } catch (e) {
      toastApiError(e, 'Add failed')
    }
  }

  const onRemovePreferred = async (employeeId: string) => {
    if (!canCarers) return
    try {
      await removeServiceUserLiveInPreferredCarer(serviceUserId, employeeId)
      await refreshProfile()
      toastSuccess('Removed', '')
    } catch (e) {
      toastApiError(e, 'Remove failed')
    }
  }

  const onAddBlocked = async (employeeId: string) => {
    if (!canCarers) return
    try {
      await addServiceUserLiveInBlockedCarer(serviceUserId, { employeeId })
      await refreshProfile()
      toastSuccess('Added', 'Blocked carer added.')
    } catch (e) {
      toastApiError(e, 'Add failed')
    }
  }

  const onRemoveBlocked = async (employeeId: string) => {
    if (!canCarers) return
    try {
      await removeServiceUserLiveInBlockedCarer(serviceUserId, employeeId)
      await refreshProfile()
      toastSuccess('Removed', '')
    } catch (e) {
      toastApiError(e, 'Remove failed')
    }
  }

  const onUploadContract = async (file: File | null) => {
    if (!file || !canDocUp) return
    try {
      await uploadServiceUserLiveInContract(serviceUserId, file)
      await refreshProfile()
      toastSuccess('Uploaded', file.name)
    } catch (e) {
      toastApiError(e, 'Upload failed')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onDeleteContract = async (documentId: string) => {
    if (!canDocDel) return
    if (!window.confirm('Remove this contract from the record?')) return
    try {
      await deleteServiceUserLiveInContract(serviceUserId, documentId)
      await refreshProfile()
      toastSuccess('Removed', '')
    } catch (e) {
      toastApiError(e, 'Delete failed')
    }
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
        You need <span className="font-mono text-xs">service_users.live_in_profile.read</span> or{' '}
        <span className="font-mono text-xs">service_users.read</span> to view this tab.
      </div>
    )
  }

  if (loading || !lookups) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className={sectionClass()}>
          <SectionTitle>Live-in Service Profile</SectionTitle>
          <p className="mb-4 text-sm text-muted-foreground">
            No live-in profile exists for this service user yet. Create one to record service type, resident contact,
            carers, contracts, and care instructions.
          </p>
          <Button
            type="button"
            className="bg-teal-800 hover:bg-teal-900"
            disabled={!canCreate || creating}
            onClick={() => void onCreate()}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              'Create live-in profile'
            )}
          </Button>
        </div>
      </div>
    )
  }

  const excludeForPreferred = [
    ...profile.blockedCarers.map((c) => c.employeeId),
    ...profile.preferredCarers.map((c) => c.employeeId),
  ]
  const excludeForBlocked = [
    ...profile.preferredCarers.map((c) => c.employeeId),
    ...profile.blockedCarers.map((c) => c.employeeId),
  ]

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <section className={sectionClass()}>
        <SectionTitle>Arrangement</SectionTitle>
        <div className="space-y-4">
          <label className="flex max-w-md cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profile.isLiveInEnabled}
              disabled={!canUpdate}
              onChange={(e) => setField('isLiveInEnabled', e.target.checked)}
            />
            Live-in service enabled
          </label>
          <label className="flex max-w-md cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={profile.isCustom}
              disabled={!canUpdate}
              onChange={(e) => setField('isCustom', e.target.checked)}
            />
            Custom setup
          </label>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">Service type</span>
            <select
              className={selectCls}
              disabled={!canUpdate}
              value={profile.serviceTypeId ?? ''}
              onChange={(e) => setField('serviceTypeId', e.target.value || null)}
            >
              <option value="">—</option>
              {lookups.serviceTypes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">Resident contact</span>
            <select
              className={selectCls}
              disabled={!canUpdate}
              value={profile.residentContactId ?? ''}
              onChange={(e) => setField('residentContactId', e.target.value || null)}
            >
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.firstName, c.lastName].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">Level of care</span>
            <select
              className={selectCls}
              disabled={!canUpdate}
              value={profile.levelOfCareId ?? ''}
              onChange={(e) => setField('levelOfCareId', e.target.value || null)}
            >
              <option value="">—</option>
              {lookups.levelsOfCare.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">Scan / check-in type</span>
            <select
              className={selectCls}
              disabled={!canUpdate}
              value={profile.scanTypeId ?? ''}
              onChange={(e) => setField('scanTypeId', e.target.value || null)}
            >
              <option value="">—</option>
              {lookups.scanTypes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">Number of carers</span>
            <Input
              type="number"
              min={1}
              max={20}
              className="max-w-xs"
              disabled={!canUpdate}
              value={profile.numberOfCarers}
              onChange={(e) => setField('numberOfCarers', Number(e.target.value) || 1)}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-start">
            <span className="pt-2 text-sm text-muted-foreground">Care instructions</span>
            <textarea
              className={cn(areaCls, !canUpdate && 'opacity-80')}
              rows={5}
              disabled={!canUpdate}
              value={profile.careInstructions ?? ''}
              onChange={(e) => setField('careInstructions', e.target.value || null)}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">Start date</span>
            <Input
              type="date"
              className="max-w-xs"
              disabled={!canUpdate}
              value={isoDateInput(profile.startDate)}
              onChange={(e) =>
                setField('startDate', e.target.value ? `${e.target.value}T00:00:00.000Z` : null)
              }
            />
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">End date</span>
            <Input
              type="date"
              className="max-w-xs"
              disabled={!canUpdate}
              value={isoDateInput(profile.endDate)}
              onChange={(e) =>
                setField('endDate', e.target.value ? `${e.target.value}T00:00:00.000Z` : null)
              }
            />
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">Review date</span>
            <Input
              type="date"
              className="max-w-xs"
              disabled={!canUpdate}
              value={isoDateInput(profile.reviewDate)}
              onChange={(e) =>
                setField('reviewDate', e.target.value ? `${e.target.value}T00:00:00.000Z` : null)
              }
            />
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-start">
            <span className="pt-2 text-sm text-muted-foreground">Notes</span>
            <textarea
              className={cn(areaCls, 'min-h-[72px]', !canUpdate && 'opacity-80')}
              rows={3}
              disabled={!canUpdate}
              value={profile.notes ?? ''}
              onChange={(e) => setField('notes', e.target.value || null)}
            />
          </div>
          <div className="grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
            <span className="text-sm text-muted-foreground">Status (on save)</span>
            <select
              className={selectCls}
              disabled={!canUpdate}
              value={profile.status}
              onChange={(e) => setField('status', e.target.value as LiveInProfileStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              className="bg-teal-800 hover:bg-teal-900"
              disabled={!canUpdate || saving}
              onClick={() => void onSave()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save profile'}
            </Button>
            {canDelete && (
              <Button type="button" variant="outline" disabled={saving} onClick={() => void onDeleteProfile()}>
                Delete profile
              </Button>
            )}
          </div>
        </div>
      </section>

      {canStatus && (
        <section className={sectionClass()}>
          <SectionTitle>Workflow status</SectionTitle>
          <p className="mb-3 text-xs text-muted-foreground">
            Use this to move the profile through workflow states (validated on the server). Current:{' '}
            <strong>{profile.status}</strong>
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">New status</label>
              <select
                className={selectCls}
                value={statusDraft}
                onChange={(e) => setStatusDraft(e.target.value as LiveInProfileStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[12rem] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Reason (optional)</label>
              <Input value={statusReason} onChange={(e) => setStatusReason(e.target.value)} placeholder="e.g. paused by coordinator" />
            </div>
            <Button type="button" className="bg-sky-700 hover:bg-sky-800" disabled={saving} onClick={() => void onStatusApply()}>
              Apply status
            </Button>
          </div>
        </section>
      )}

      <section className={sectionClass()}>
        <SectionTitle>Preferred carers</SectionTitle>
        <EmployeeSearchMini
          serviceUserId={serviceUserId}
          disabled={!canCarers}
          excludeEmployeeIds={excludeForPreferred}
          onPick={(id) => void onAddPreferred(id)}
        />
        <ul className="mt-3 space-y-2">
          {profile.preferredCarers.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>{carerLabel(row)}</span>
              {canCarers && (
                <button
                  type="button"
                  className="text-destructive hover:underline"
                  onClick={() => void onRemovePreferred(row.employeeId)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
          {profile.preferredCarers.length === 0 && (
            <li className="text-sm text-muted-foreground">None listed.</li>
          )}
        </ul>
      </section>

      <section className={sectionClass()}>
        <SectionTitle>Blocked carers</SectionTitle>
        <EmployeeSearchMini
          serviceUserId={serviceUserId}
          disabled={!canCarers}
          excludeEmployeeIds={excludeForBlocked}
          onPick={(id) => void onAddBlocked(id)}
        />
        <ul className="mt-3 space-y-2">
          {profile.blockedCarers.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>{carerLabel(row)}</span>
              {canCarers && (
                <button
                  type="button"
                  className="text-destructive hover:underline"
                  onClick={() => void onRemoveBlocked(row.employeeId)}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
          {profile.blockedCarers.length === 0 && <li className="text-sm text-muted-foreground">None listed.</li>}
        </ul>
      </section>

      <section className={sectionClass()}>
        <SectionTitle>Contract documents</SectionTitle>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => void onUploadContract(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="default"
            className="bg-teal-800 hover:bg-teal-900"
            disabled={!canDocUp}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload contract
          </Button>
        </div>
        <ul className="space-y-2">
          {profile.contractDocuments.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate">{doc.originalName}</span>
              <div className="flex shrink-0 gap-2">
                {canDocDl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void downloadServiceUserLiveInContract(serviceUserId, doc.id, doc.originalName).catch((e) =>
                        toastApiError(e, 'Download failed'),
                      )
                    }
                  >
                    Download
                  </Button>
                )}
                {canDocDel && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => void onDeleteContract(doc.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          ))}
          {profile.contractDocuments.length === 0 && (
            <li className="text-sm text-muted-foreground">No active contract files.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
