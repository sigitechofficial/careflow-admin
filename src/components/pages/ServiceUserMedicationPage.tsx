import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Pill, Pencil, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/api-base'
import { ApiError } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { AddMedicationDialog } from '@/features/service-users/medication/AddMedicationDialog'
import {
  fetchServiceUser,
  listServiceUserMedications,
  type MedicationScheduleSummary,
  type ServiceUserDetail,
  type ServiceUserMedicationRow,
} from '@/lib/service-users-api'

type MedicationSlotTableRow = {
  rowKey: string
  medication: ServiceUserMedicationRow
  schedule: MedicationScheduleSummary | null
}

function formatShortDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}-${mm}-${yyyy}`
}

function displayName(d: ServiceUserDetail | null): string {
  if (!d) return 'Service user'
  const legal = [d.firstName, d.lastName].filter(Boolean).join(' ').trim()
  if (d.preferredName?.trim()) {
    return legal ? `${legal} (${d.preferredName.trim()})` : d.preferredName.trim()
  }
  return legal || 'Service user'
}

function freqLabel(m: ServiceUserMedicationRow): string {
  return m.frequency?.name?.trim() || m.frequencyText?.trim() || '—'
}

function expandMedicationsToSlotRows(medications: ServiceUserMedicationRow[]): MedicationSlotTableRow[] {
  const out: MedicationSlotTableRow[] = []
  for (const m of medications) {
    const slots = (m.schedules ?? []).filter(s => s.dueTime)
    if (slots.length === 0) {
      out.push({ rowKey: `${m.id}:none`, medication: m, schedule: null })
      continue
    }
    for (const schedule of slots) {
      out.push({
        rowKey: `${m.id}:${schedule.id}`,
        medication: m,
        schedule,
      })
    }
  }
  return out.sort((a, b) => {
    const nameCmp = a.medication.medicationName.localeCompare(b.medication.medicationName)
    if (nameCmp !== 0) return nameCmp
    return (a.schedule?.dueTime ?? '').localeCompare(b.schedule?.dueTime ?? '')
  })
}

export default function ServiceUserMedicationPage() {
  const params = useParams({ strict: false }) as { serviceUserId?: string }
  const serviceUserId = params.serviceUserId ?? ''
  const apiConfigured = Boolean(getApiBaseUrl())
  const permissions = useAuthStore(s => s.user?.permissions)
  /** Nest allows create with `service_users.update` or `service_users.medications.create`. */
  const canAddMedication = React.useMemo(() => {
    const p = (permissions ?? []) as string[]
    return p.includes('service_users.update') || p.includes('service_users.medications.create')
  }, [permissions])

  const [detail, setDetail] = React.useState<ServiceUserDetail | null>(null)
  const [rows, setRows] = React.useState<ServiceUserMedicationRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = React.useState(false)

  const slotRows = React.useMemo(() => expandMedicationsToSlotRows(rows), [rows])

  const reloadMedications = React.useCallback(async () => {
    if (!serviceUserId || !apiConfigured) return
    const med = await listServiceUserMedications(serviceUserId, { limit: 100 })
    setRows(med.rows)
  }, [apiConfigured, serviceUserId])

  React.useEffect(() => {
    if (!apiConfigured || !serviceUserId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [d, med] = await Promise.all([
          fetchServiceUser(serviceUserId),
          listServiceUserMedications(serviceUserId, { limit: 100 }),
        ])
        if (cancelled) return
        setDetail(d)
        setRows(med.rows)
      } catch (e) {
        if (!cancelled) {
          setDetail(null)
          setRows([])
          setError(e instanceof ApiError ? e.message : 'Failed to load medications')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [apiConfigured, serviceUserId])

  if (!serviceUserId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Missing service user id.{' '}
        <Link to="/service-users/all" className="text-primary underline">
          Back to list
        </Link>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-muted/20 pb-12">
      <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
              <Link to="/service-users/all">
                <ArrowLeft className="h-3.5 w-3.5" />
                All service users
              </Link>
            </Button>
            <span className="text-muted-foreground hidden sm:inline">·</span>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#4db8c8] text-[#4db8c8]">
                <Pill className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">Medication</h1>
                <p className="truncate text-sm text-muted-foreground">{displayName(detail)}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canAddMedication && (
              <Button
                type="button"
                size="sm"
                className="gap-1 bg-teal-700 text-white hover:bg-teal-800"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add medication
              </Button>
            )}
            <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
              <Link to="/service-users/$serviceUserId" params={{ serviceUserId }}>
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {!apiConfigured && (
          <p className="text-sm text-muted-foreground">API base URL is not configured.</p>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}
        {error && !loading && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && apiConfigured && (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-teal-800 px-3 py-2 text-sm font-semibold text-white dark:bg-teal-900">
              <span>
                Current medications ({rows.length}
                {slotRows.length !== rows.length
                  ? ` · ${slotRows.length} administration ${slotRows.length === 1 ? 'slot' : 'slots'}`
                  : ''}
                )
              </span>
              {canAddMedication && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1 bg-white/15 text-white hover:bg-white/25"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>
            {slotRows.length === 0 ? (
              <div className="space-y-2 p-4 text-sm text-muted-foreground">
                <p>No active medications recorded for this service user.</p>
                {canAddMedication ? (
                  <p>
                    Use <span className="font-medium text-foreground">Add medication</span> above to record a
                    prescription or MAR item.
                  </p>
                ) : (
                  <p>
                    Your account does not have permission to add medications here. An administrator can grant{' '}
                    <span className="font-mono text-xs">service_users.update</span> (or{' '}
                    <span className="font-mono text-xs">service_users.medications.create</span> on the API). Records
                    can also be created via the CareAdmin API{' '}
                    <span className="font-mono text-xs">{`POST /service-users/{id}/medications`}</span>.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Dose / strength</th>
                      <th className="px-3 py-2">Route</th>
                      <th className="px-3 py-2">Frequency</th>
                      <th className="px-3 py-2">Time</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slotRows.map(({ rowKey, medication: m, schedule }) => (
                      <tr key={rowKey} className="border-b border-border/80 last:border-0">
                        <td className="px-3 py-2 font-medium">
                          {m.medicationName}
                          {m.medicationPack?.name && (
                            <span
                              className="ml-1.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-xs font-normal text-sky-900 dark:text-sky-100"
                              title={`Blister pack: ${m.medicationPack.name}`}
                            >
                              Pack
                            </span>
                          )}
                          {m.isControlledMedication && (
                            <span className="ml-1.5 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-normal text-amber-900 dark:text-amber-100">
                              CD
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {[m.dose, m.strength].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{m.route?.name ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{freqLabel(m)}</td>
                        <td className="px-3 py-2 font-medium tabular-nums text-foreground">
                          {schedule?.dueTime ?? '—'}
                          {schedule?.dueVisitName ? (
                            <span
                              className="mt-0.5 block text-xs font-normal text-muted-foreground"
                              title={schedule.dueVisitName}
                            >
                              {schedule.dueVisitName}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-medium',
                              m.status === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                                : m.status === 'PAUSED'
                                  ? 'bg-amber-500/15 text-amber-900 dark:text-amber-100'
                                  : 'bg-muted text-muted-foreground',
                            )}
                          >
                            {m.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{formatShortDate(m.startDate)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{formatShortDate(m.endDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <AddMedicationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serviceUserId={serviceUserId}
        canSave={canAddMedication}
        onSaved={reloadMedications}
      />
    </div>
  )
}
