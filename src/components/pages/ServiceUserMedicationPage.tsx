import * as React from 'react'
import { Link, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Pill, Pencil, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/api-base'
import { ApiError } from '@/lib/api-client'
import { toastApiError, toastError, toastSuccess } from '@/lib/toast'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createServiceUserMedication,
  fetchMedicationLookups,
  fetchServiceUser,
  listServiceUserMedications,
  type CreateServiceUserMedicationPayload,
  type MedicationLookupsBundle,
  type ServiceUserDetail,
  type ServiceUserMedicationRow,
} from '@/lib/service-users-api'

const SELECT_NONE = '__none__'

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

function optionalId(v: string): string | undefined {
  return v && v !== SELECT_NONE ? v : undefined
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
  const [lookups, setLookups] = React.useState<MedicationLookupsBundle | null>(null)
  const [lookupsLoading, setLookupsLoading] = React.useState(false)
  const [lookupsError, setLookupsError] = React.useState<string | null>(null)

  const [medicationName, setMedicationName] = React.useState('')
  const [medicationKind, setMedicationKind] = React.useState<'REGULAR' | 'PRN'>('REGULAR')
  const [dose, setDose] = React.useState('')
  const [strength, setStrength] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [routeId, setRouteId] = React.useState(SELECT_NONE)
  const [frequencyId, setFrequencyId] = React.useState(SELECT_NONE)
  const [categoryId, setCategoryId] = React.useState(SELECT_NONE)
  const [medicationTypeId, setMedicationTypeId] = React.useState(SELECT_NONE)
  const [frequencyText, setFrequencyText] = React.useState('')
  const [instructions, setInstructions] = React.useState('')
  const [isControlledMedication, setIsControlledMedication] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [formSaving, setFormSaving] = React.useState(false)

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

  React.useEffect(() => {
    if (!dialogOpen || !apiConfigured || lookups) return
    let cancelled = false
    ;(async () => {
      setLookupsLoading(true)
      setLookupsError(null)
      try {
        const b = await fetchMedicationLookups()
        if (!cancelled) setLookups(b)
      } catch (e) {
        if (!cancelled) {
          setLookupsError(e instanceof ApiError ? e.message : 'Failed to load medication lookups')
        }
      } finally {
        if (!cancelled) setLookupsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [dialogOpen, apiConfigured, lookups])

  function resetAddForm() {
    setMedicationName('')
    setMedicationKind('REGULAR')
    setDose('')
    setStrength('')
    setStartDate('')
    setRouteId(SELECT_NONE)
    setFrequencyId(SELECT_NONE)
    setCategoryId(SELECT_NONE)
    setMedicationTypeId(SELECT_NONE)
    setFrequencyText('')
    setInstructions('')
    setIsControlledMedication(false)
    setFormError(null)
  }

  function openAddDialog() {
    resetAddForm()
    setDialogOpen(true)
  }

  function onDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      setFormError(null)
    }
  }

  async function saveMedication() {
    const name = medicationName.trim()
    if (!name) {
      setFormError('Medication name is required.')
      toastError('Cannot save', 'Enter a medication name.')
      return
    }
    setFormError(null)
    const payload: CreateServiceUserMedicationPayload = {
      medicationName: name,
      medicationKind,
      dose: dose.trim() || undefined,
      strength: strength.trim() || undefined,
      startDate: startDate.trim() || undefined,
      routeId: optionalId(routeId),
      frequencyId: optionalId(frequencyId),
      categoryId: optionalId(categoryId),
      medicationTypeId: optionalId(medicationTypeId),
      frequencyText: frequencyText.trim() || undefined,
      instructions: instructions.trim() || undefined,
      isControlledMedication,
    }

    setFormSaving(true)
    try {
      await createServiceUserMedication(serviceUserId, payload)
      setDialogOpen(false)
      resetAddForm()
      await reloadMedications()
      toastSuccess('Medication added', 'The medication list has been updated.')
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Save failed')
      toastApiError(e, 'Save failed')
    } finally {
      setFormSaving(false)
    }
  }

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
                onClick={() => openAddDialog()}
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
              <span>Current medications ({rows.length})</span>
              {canAddMedication && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-8 gap-1 bg-white/15 text-white hover:bg-white/25"
                  onClick={() => openAddDialog()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            </div>
            {rows.length === 0 ? (
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
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2">End</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(m => (
                      <tr key={m.id} className="border-b border-border/80 last:border-0">
                        <td className="px-3 py-2 font-medium">
                          {m.medicationName}
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

      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent size="md" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-teal-800 dark:text-teal-200">Add medication</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {lookupsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading lookups…
              </div>
            )}
            {lookupsError && (
              <p className="text-sm text-destructive" role="alert">
                {lookupsError}
              </p>
            )}
            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">
                Medication name <span className="text-destructive">*</span>
              </label>
              <Input
                value={medicationName}
                onChange={e => setMedicationName(e.target.value)}
                placeholder="e.g. Amlodipine"
                disabled={formSaving || lookupsLoading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Kind</label>
              <Select
                value={medicationKind}
                onValueChange={v => setMedicationKind(v as 'REGULAR' | 'PRN')}
                disabled={formSaving || lookupsLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGULAR">Regular</SelectItem>
                  <SelectItem value="PRN">PRN (as needed)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Dose</label>
                <Input
                  value={dose}
                  onChange={e => setDose(e.target.value)}
                  placeholder="e.g. 1 tablet"
                  disabled={formSaving || lookupsLoading}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Strength</label>
                <Input
                  value={strength}
                  onChange={e => setStrength(e.target.value)}
                  placeholder="e.g. 5mg"
                  disabled={formSaving || lookupsLoading}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Start date</label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                disabled={formSaving || lookupsLoading}
              />
            </div>

            {lookups && (
              <>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Route</label>
                  <Select value={routeId} onValueChange={setRouteId} disabled={formSaving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value={SELECT_NONE}>—</SelectItem>
                      {lookups.routes.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Frequency</label>
                  <Select value={frequencyId} onValueChange={setFrequencyId} disabled={formSaving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value={SELECT_NONE}>—</SelectItem>
                      {lookups.frequencies.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Category</label>
                  <Select value={categoryId} onValueChange={setCategoryId} disabled={formSaving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value={SELECT_NONE}>—</SelectItem>
                      {lookups.categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">Medication type</label>
                  <Select value={medicationTypeId} onValueChange={setMedicationTypeId} disabled={formSaving}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      <SelectItem value={SELECT_NONE}>—</SelectItem>
                      {lookups.types.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Frequency (free text)</label>
              <Input
                value={frequencyText}
                onChange={e => setFrequencyText(e.target.value)}
                placeholder="If not in list above"
                disabled={formSaving || lookupsLoading}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">Instructions</label>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                disabled={formSaving || lookupsLoading}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="How and when to take"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isControlledMedication}
                onChange={e => setIsControlledMedication(e.target.checked)}
                disabled={formSaving || lookupsLoading}
                className="h-4 w-4 rounded border-input"
              />
              Controlled drug (CD)
            </label>
          </DialogBody>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={formSaving}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-teal-700 text-white hover:bg-teal-800"
              disabled={formSaving || !canAddMedication}
              onClick={() => void saveMedication()}
            >
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save medication'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
