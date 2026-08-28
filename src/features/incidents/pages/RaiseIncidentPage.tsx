import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Lock, MapPin, Trash2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { Badge } from '@/shared/ui/badge'
import { toastApiError } from '@/shared/lib/toast'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useIncidentCategories, useCreateIncident } from '@/features/incidents/hooks/useIncidents'
import { IncidentInjuryCaptureDialog } from '@/features/incidents/components/IncidentInjuryCaptureDialog'
import {
  persistIncidentInjury,
  type PendingIncidentInjury,
} from '@/features/incidents/utils/incident-injury-persist'
import {
  IMMEDIATE_ACTION_OPTIONS,
  INCIDENT_INJURY_SEVERITY_OPTIONS,
  type CreateIncidentInput,
  type IncidentInjurySeverity,
  type IncidentListItem,
  type IncidentSeverity,
} from '@/features/incidents/types'

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

const INJURY_SEVERITY_BADGE: Record<IncidentInjurySeverity, 'info' | 'warning' | 'destructive'> = {
  MINOR: 'info',
  MODERATE: 'warning',
  SERIOUS: 'destructive',
  FATAL: 'destructive',
}

function newInjuryId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `inj-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  }
}

function nowLocalDatetime(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Toggle({
  value,
  onChange,
  labelledBy,
}: {
  value: boolean
  onChange: (v: boolean) => void
  labelledBy?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!value)}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
        value ? 'bg-primary border-transparent' : 'bg-muted border-border',
      )}
    >
      <span
        className={cn(
          'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          value ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export default function RaiseIncidentPage() {
  const navigate = useNavigate()
  const categoriesQuery = useIncidentCategories()
  const createMutation = useCreateIncident()

  const [suSearch, setSuSearch] = React.useState('')
  const serviceUsersQuery = useServiceUsers({ limit: 50, search: suSearch || undefined })

  const [categoryId, setCategoryId] = React.useState('')
  const [subtypeId, setSubtypeId] = React.useState('')
  const [occurredAtLocal, setOccurredAtLocal] = React.useState(nowLocalDatetime)
  const [serviceUserId, setServiceUserId] = React.useState('')
  const [specificArea, setSpecificArea] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [contextBefore, setContextBefore] = React.useState('')
  const [contextAfter, setContextAfter] = React.useState('')
  const [immediateActions, setImmediateActions] = React.useState('')
  const [actionCodes, setActionCodes] = React.useState<string[]>([])
  const [injuryOccurred, setInjuryOccurred] = React.useState(false)
  const [injuries, setInjuries] = React.useState<PendingIncidentInjury[]>([])
  const [bodyMapOpen, setBodyMapOpen] = React.useState(false)
  const [injType, setInjType] = React.useState('')
  const [injSeverity, setInjSeverity] = React.useState<IncidentInjurySeverity>('MINOR')
  const [injNotes, setInjNotes] = React.useState('')
  const [severity, setSeverity] = React.useState<IncidentSeverity>('LOW')
  const [keepPrivate, setKeepPrivate] = React.useState(false)
  const [shareHandover, setShareHandover] = React.useState(true)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState<IncidentListItem | null>(null)

  const categories = categoriesQuery.data ?? []
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null
  const isMedication = selectedCategory?.key === 'MEDICATION'
  const isBehaviour = selectedCategory?.key === 'BEHAVIOUR'

  const serviceUserOptions: ComboboxOption[] = React.useMemo(
    () =>
      (serviceUsersQuery.data?.rows ?? []).map((r) => ({
        value: r.id,
        label: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: r.serviceUserNumber ?? undefined,
      })),
    [serviceUsersQuery.data],
  )

  function toggleActionCode(code: string) {
    setActionCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function addPendingInjury(injury: PendingIncidentInjury) {
    setInjuries((prev) => [...prev, injury])
    setInjuryOccurred(true)
  }

  function addManualInjury() {
    if (!injType.trim()) return
    addPendingInjury({
      id: newInjuryId(),
      injuryType: injType.trim(),
      severity: injSeverity,
      notes: injNotes.trim() || undefined,
      marker: null,
    })
    setInjType('')
    setInjNotes('')
    setInjSeverity('MINOR')
  }

  function removeInjury(id: string) {
    setInjuries((prev) => prev.filter((i) => i.id !== id))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!categoryId) next.categoryId = 'Select what you are reporting'
    if (!occurredAtLocal) next.occurredAt = 'Enter the date and time'
    else if (new Date(occurredAtLocal).getTime() > Date.now() + 60_000)
      next.occurredAt = 'The date/time cannot be in the future'
    if (!description.trim()) next.description = 'Describe what happened'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    const input: CreateIncidentInput = {
      categoryId,
      subtypeId: subtypeId || undefined,
      occurredAt: new Date(occurredAtLocal).toISOString(),
      primaryServiceUserId: serviceUserId || undefined,
      specificArea: specificArea.trim() || undefined,
      description: description.trim(),
      contextBefore: contextBefore.trim() || undefined,
      contextAfter: contextAfter.trim() || undefined,
      immediateActions: immediateActions.trim() || undefined,
      immediateActionCodes: actionCodes.length ? actionCodes : undefined,
      injuryOccurred: injuryOccurred || injuries.length > 0,
      severity,
      privacyLevel: keepPrivate ? 'RESTRICTED' : 'NORMAL',
      shareWithHandover: shareHandover,
    }
    try {
      const created = await createMutation.mutateAsync(input)
      // The incident now exists, so persist each captured injury (with its body-map pin) against it.
      let injuryFailures = 0
      for (const injury of injuries) {
        try {
          await persistIncidentInjury(created.id, serviceUserId || null, injury)
        } catch {
          injuryFailures += 1
        }
      }
      if (injuryFailures > 0) {
        toastApiError(
          new Error(
            `Incident saved, but ${injuryFailures} injury detail(s) could not be recorded. Add them on the incident record.`,
          ),
        )
      }
      setSubmitted(created)
    } catch (err) {
      toastApiError(err)
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Incident reported"
          icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />}
          breadcrumb={[
            { label: 'Home', href: '/' },
            { label: 'Accident & Incident' },
            { label: 'Raise' },
          ]}
        />
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-foreground">Incident reported successfully</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The appropriate manager has been notified.
          </p>
          <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              {submitted.referenceNumber}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {submitted.category.label}
              {submitted.subtype ? ` · ${submitted.subtype.label}` : ''} · {submitted.severityLabel} severity
            </p>
            {injuries.length > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {injuries.length} injur{injuries.length === 1 ? 'y' : 'ies'} recorded
                {injuries.some((i) => i.marker) ? ' (with body map)' : ''}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto flex max-w-xl justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(null)
              setCategoryId('')
              setSubtypeId('')
              setServiceUserId('')
              setSpecificArea('')
              setDescription('')
              setContextBefore('')
              setContextAfter('')
              setImmediateActions('')
              setActionCodes([])
              setInjuryOccurred(false)
              setInjuries([])
              setInjType('')
              setInjNotes('')
              setInjSeverity('MINOR')
              setSeverity('LOW')
              setKeepPrivate(false)
              setOccurredAtLocal(nowLocalDatetime())
              setErrors({})
            }}
          >
            Report another
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: '/incidents/$incidentId', params: { incidentId: submitted.id } })}
          >
            Open incident
          </Button>
          <Button onClick={() => navigate({ to: '/incidents/view' })}>View all incidents</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Raise Accident / Incident"
        description="Report an accident, incident or near miss. Keep it quick — a manager will review and investigate."
        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'Raise' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">What happened?</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="What are you reporting?" htmlFor="inc-category" required error={errors.categoryId}>
              <select
                id="inc-category"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setSubtypeId('')
                }}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>

            {selectedCategory && selectedCategory.subtypes.length > 0 && (
              <FormField label="Type" htmlFor="inc-subtype">
                <select
                  id="inc-subtype"
                  value={subtypeId}
                  onChange={(e) => setSubtypeId(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select…</option>
                  {selectedCategory.subtypes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Date & time of incident" htmlFor="inc-when" required error={errors.occurredAt}>
              <Input
                id="inc-when"
                type="datetime-local"
                value={occurredAtLocal}
                onChange={(e) => setOccurredAtLocal(e.target.value)}
              />
            </FormField>

            <FormField label="Person affected (service user)" hint="Search by name">
              <Combobox
                options={serviceUserOptions}
                value={serviceUserId}
                onChange={setServiceUserId}
                onSearchChange={setSuSearch}
                loading={serviceUsersQuery.isLoading}
                placeholder="Select service user (optional)"
                searchPlaceholder="Search service users…"
                allowDeselect
              />
            </FormField>

            <FormField label="Specific area / location" htmlFor="inc-area" className="sm:col-span-2">
              <Input
                id="inc-area"
                value={specificArea}
                onChange={(e) => setSpecificArea(e.target.value)}
                placeholder="e.g. Bathroom, upstairs landing"
              />
            </FormField>

            <FormField label="Description" htmlFor="inc-desc" required error={errors.description} className="sm:col-span-2">
              <Textarea
                id="inc-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened…"
              />
            </FormField>

            <FormField
              label={isBehaviour ? 'What happened immediately before? (triggers)' : 'What happened immediately before?'}
              htmlFor="inc-before"
              className="sm:col-span-2"
            >
              <Textarea
                id="inc-before"
                rows={2}
                value={contextBefore}
                onChange={(e) => setContextBefore(e.target.value)}
              />
            </FormField>

            <FormField label="What happened afterwards?" htmlFor="inc-after" className="sm:col-span-2">
              <Textarea
                id="inc-after"
                rows={2}
                value={contextAfter}
                onChange={(e) => setContextAfter(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Immediate actions taken</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {IMMEDIATE_ACTION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={actionCodes.includes(opt.value)}
                  onChange={() => toggleActionCode(opt.value)}
                  className="h-4 w-4 rounded border-border"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <FormField label="Additional notes" htmlFor="inc-actions" className="mt-4">
            <Textarea
              id="inc-actions"
              rows={2}
              value={immediateActions}
              onChange={(e) => setImmediateActions(e.target.value)}
            />
          </FormField>
          {isMedication && (
            <p className="mt-3 rounded-md bg-info/10 px-3 py-2 text-xs text-info">
              Medication incident — the clinical / medication lead will be notified for review.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground">Injuries</h3>
            <div className="flex items-center gap-3">
              <span id="inc-injured-label" className="text-sm font-medium text-foreground">
                Anyone injured?
              </span>
              <Toggle value={injuryOccurred} onChange={setInjuryOccurred} labelledBy="inc-injured-label" />
            </div>
          </div>

          {injuryOccurred ? (
            <div className="space-y-3">
              {injuries.length > 0 && (
                <ul className="space-y-2">
                  {injuries.map((inj) => (
                    <li
                      key={inj.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                          {inj.injuryType}
                          <Badge variant={INJURY_SEVERITY_BADGE[inj.severity]} size="sm">
                            {inj.severity}
                          </Badge>
                          {inj.marker && (
                            <Badge variant="info" size="sm">
                              <MapPin className="mr-0.5 h-3 w-3" /> On body map
                            </Badge>
                          )}
                        </p>
                        {(inj.marker || inj.notes) && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[inj.marker?.summaryLabel || inj.marker?.bodyPart, inj.marker?.side, inj.notes]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Remove injury"
                        onClick={() => removeInjury(inj.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-2">
                {serviceUserId ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setBodyMapOpen(true)}>
                    <MapPin className="mr-1 h-3.5 w-3.5" /> Add on body map
                  </Button>
                ) : (
                  <p className="text-xs text-warning">
                    Select a “Person affected (service user)” above to place injuries on the body map.
                  </p>
                )}
              </div>

              <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
                <p className="text-xs text-muted-foreground">Or add an injury without the body map:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    className="w-48"
                    placeholder="Injury type (e.g. Bruising)"
                    value={injType}
                    onChange={(e) => setInjType(e.target.value)}
                  />
                  <select
                    className="h-10 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={injSeverity}
                    onChange={(e) => setInjSeverity(e.target.value as IncidentInjurySeverity)}
                  >
                    {INCIDENT_INJURY_SEVERITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="w-48"
                    placeholder="Notes (optional)"
                    value={injNotes}
                    onChange={(e) => setInjNotes(e.target.value)}
                  />
                  <Button type="button" size="sm" disabled={!injType.trim()} onClick={addManualInjury}>
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Turn on if an injury occurred — you can then pinpoint it on the body map before submitting.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Severity &amp; sharing</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Severity" htmlFor="inc-sev">
              <select
                id="inc-sev"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="flex items-center gap-3">
              <span id="inc-private-label" className="text-sm font-medium text-foreground">
                Keep private
              </span>
              <Toggle value={keepPrivate} onChange={setKeepPrivate} labelledBy="inc-private-label" />
              {keepPrivate && <Lock className="h-4 w-4 text-destructive" aria-hidden />}
            </div>

            <div className="flex items-center gap-3">
              <span id="inc-handover-label" className="text-sm font-medium text-foreground">
                Share with handover
              </span>
              <Toggle value={shareHandover} onChange={setShareHandover} labelledBy="inc-handover-label" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate({ to: '/incidents/view' })}>
            Cancel
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            Submit report
          </Button>
        </div>
      </form>

      {serviceUserId && (
        <IncidentInjuryCaptureDialog
          open={bodyMapOpen}
          onOpenChange={setBodyMapOpen}
          serviceUserId={serviceUserId}
          onCapture={addPendingInjury}
        />
      )}
    </div>
  )
}
