import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, ChevronDown, Lock, MapPin, Paperclip, Trash2, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { Badge } from '@/shared/ui/badge'
import { toastApiError, toastWarning } from '@/shared/lib/toast'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import { useIncidentCategories, useCreateIncident } from '@/features/incidents/hooks/useIncidents'
import { IncidentInjuryCaptureDialog } from '@/features/incidents/components/IncidentInjuryCaptureDialog'
import {
  persistIncidentInjury,
  type PendingIncidentInjury,
} from '@/features/incidents/utils/incident-injury-persist'
import {
  persistIncidentWitness,
  persistIncidentPhoto,
  type PendingWitness,
} from '@/features/incidents/utils/incident-raise-persist'
import {
  IMMEDIATE_ACTION_OPTIONS,
  INCIDENT_INJURY_SEVERITY_OPTIONS,
  INCIDENT_PERSON_KIND_OPTIONS,
  type CreateIncidentInput,
  type IncidentInjurySeverity,
  type IncidentListItem,
  type IncidentPersonKind,
  type IncidentSeverity,
} from '@/features/incidents/types'

/** A photo/evidence file staged on the raise form; uploaded after the incident is created. */
type PendingPhoto = {
  id: string
  file: File
  previewUrl: string
}

/** Matches the backend CreateIncidentDto @MaxLength(8000) on the free-text fields. */
const TEXT_MAX_LENGTH = 8000
const DESCRIPTION_COUNTER_FROM = 7000

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

import { createClientUuid } from '@/shared/lib/create-client-uuid'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { nowOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'

const INJURY_SEVERITY_BADGE: Record<IncidentInjurySeverity, 'info' | 'warning' | 'destructive'> = {
  MINOR: 'info',
  MODERATE: 'warning',
  SERIOUS: 'destructive',
  FATAL: 'destructive',
}

function newInjuryId(): string {
  return createClientUuid()
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

/** A dropdown that opens a checkbox list for multi-selection. */
function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Select…',
}: {
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])
  const summary = selected.length
    ? options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ')
    : placeholder
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  }
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={cn('truncate', selected.length ? 'text-foreground' : 'text-muted-foreground')}>
          {summary}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-card p-1 shadow-md">
          {options.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/60"
            >
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
                className="h-4 w-4 rounded border-border"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RaiseIncidentPage() {
  const navigate = useNavigate()
  const categoriesQuery = useIncidentCategories()
  const createMutation = useCreateIncident()

  const [suSearch, setSuSearch] = React.useState('')
  const serviceUsersQuery = useServiceUsers({ limit: 50, search: suSearch || undefined })

  const [empSearch, setEmpSearch] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: empSearch || undefined })
  const locationsQuery = useServiceUserLocations()

  // Who was primarily affected — service user, staff, or another person (family/visitor/etc.).
  const [affectedKinds, setAffectedKinds] = React.useState<IncidentPersonKind[]>(['SERVICE_USER'])
  const [employeeId, setEmployeeId] = React.useState('')
  const [affectedPersonName, setAffectedPersonName] = React.useState('')
  const [zoneId, setZoneId] = React.useState('')
  const [locationId, setLocationId] = React.useState('')

  const [categoryId, setCategoryId] = React.useState('')
  const [subtypeId, setSubtypeId] = React.useState('')
  // null = not edited yet: default to "now" in the org timezone, recomputed so it stays correct once
  // organisation settings (timezone) finish loading after mount. Subscribing to the display-format
  // context re-renders this page when that timezone arrives.
  useOrganisationDisplayFormat()
  const [occurredAtEdited, setOccurredAtLocal] = React.useState<string | null>(null)
  const occurredAtLocal = occurredAtEdited ?? nowOrgDatetimeLocal()
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
  // Witnesses (persisted after the incident is created).
  const [witnesses, setWitnesses] = React.useState<PendingWitness[]>([])
  const [witName, setWitName] = React.useState('')
  const [witKind, setWitKind] = React.useState<IncidentPersonKind>('EMPLOYEE')
  const [witStatement, setWitStatement] = React.useState('')
  // Photos / evidence (uploaded after the incident is created).
  const [photos, setPhotos] = React.useState<PendingPhoto[]>([])
  const [severity, setSeverity] = React.useState<IncidentSeverity>('LOW')
  const [keepPrivate, setKeepPrivate] = React.useState(false)
  const [shareHandover, setShareHandover] = React.useState(true)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState<IncidentListItem | null>(null)
  const [savedInjuries, setSavedInjuries] = React.useState<{ count: number; withBodyMap: boolean }>({
    count: 0,
    withBodyMap: false,
  })
  const [saveWarning, setSaveWarning] = React.useState<string | null>(null)
  // Covers the create call AND the follow-up injury/witness/photo uploads; the ref blocks rapid
  // repeat clicks that land before React re-renders the disabled button.
  const [submitting, setSubmitting] = React.useState(false)
  const submittingRef = React.useRef(false)

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

  const employeeOptions: ComboboxOption[] = React.useMemo(
    () =>
      (employeesQuery.data?.rows ?? []).map((r) => ({
        value: r.id,
        label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: r.jobTitle?.name ?? undefined,
      })),
    [employeesQuery.data],
  )

  const zoneOptions = React.useMemo(
    () => locationsQuery.data?.zones ?? [],
    [locationsQuery.data],
  )

  const branchOptions = React.useMemo(() => {
    const zone = zoneOptions.find((z) => z.id === zoneId)
    return zone?.branches ?? []
  }, [zoneOptions, zoneId])

  // Free any created object URLs when the form unmounts (ref keeps the latest list).
  const photosRef = React.useRef<PendingPhoto[]>([])
  photosRef.current = photos
  React.useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    }
  }, [])

  function toggleActionCode(code: string) {
    setActionCodes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function addWitness() {
    if (!witName.trim() && !witStatement.trim()) return
    setWitnesses((prev) => [
      ...prev,
      {
        id: newInjuryId(),
        personKind: witKind,
        personName: witName.trim(),
        statement: witStatement.trim(),
      },
    ])
    setWitName('')
    setWitStatement('')
    setWitKind('EMPLOYEE')
  }

  function removeWitness(id: string) {
    setWitnesses((prev) => prev.filter((w) => w.id !== id))
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    const next: PendingPhoto[] = Array.from(files).map((file) => ({
      id: newInjuryId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...next])
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
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

  function clearError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!categoryId) next.categoryId = 'Select what you are reporting'
    const occurredIso = occurredAtLocal ? orgDatetimeLocalToIso(occurredAtLocal) : ''
    if (!occurredIso) next.occurredAt = 'Enter the date and time'
    else if (Date.parse(occurredIso) > Date.now() + 60_000)
      next.occurredAt = 'The date/time cannot be in the future'
    if (!description.trim()) next.description = 'Describe what happened'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    if (!validate()) return
    submittingRef.current = true
    setSubmitting(true)
    const input: CreateIncidentInput = {
      categoryId,
      subtypeId: subtypeId || undefined,
      occurredAt: orgDatetimeLocalToIso(occurredAtLocal),
      primaryServiceUserId: affectedKinds.includes('SERVICE_USER')
        ? serviceUserId || undefined
        : undefined,
      primaryEmployeeId: affectedKinds.includes('EMPLOYEE')
        ? employeeId || undefined
        : undefined,
      affectedPersonKinds: affectedKinds.length ? affectedKinds : undefined,
      primaryPersonKind: affectedKinds[0],
      primaryPersonName: affectedKinds.some(
        (k) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE',
      )
        ? affectedPersonName.trim() || undefined
        : undefined,
      locationId: locationId || undefined,
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
      const persistedInjuries: PendingIncidentInjury[] = []
      for (const injury of injuries) {
        try {
          await persistIncidentInjury(created.id, serviceUserId || null, injury)
          persistedInjuries.push(injury)
        } catch {
          injuryFailures += 1
        }
      }
      // Persist witnesses captured on the raise form.
      let witnessFailures = 0
      for (const witness of witnesses) {
        try {
          await persistIncidentWitness(created.id, witness)
        } catch {
          witnessFailures += 1
        }
      }
      // Upload staged photos / evidence.
      let photoFailures = 0
      for (const photo of photos) {
        try {
          await persistIncidentPhoto(created.id, photo.file)
        } catch {
          photoFailures += 1
        }
      }
      const failureParts: string[] = []
      if (injuryFailures > 0) failureParts.push(`${injuryFailures} injury detail(s)`)
      if (witnessFailures > 0) failureParts.push(`${witnessFailures} witness(es)`)
      if (photoFailures > 0) failureParts.push(`${photoFailures} photo(s)`)
      const warning =
        failureParts.length > 0
          ? `${failureParts.join(', ')} could not be recorded. Add them on the incident record.`
          : null
      if (warning) toastWarning('Incident saved with missing details', warning)
      setSaveWarning(warning)
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      setSavedInjuries({
        count: persistedInjuries.length,
        withBodyMap: persistedInjuries.some((i) => i.marker),
      })
      setSubmitted(created)
    } catch (err) {
      toastApiError(err)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
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
            {savedInjuries.count > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                {savedInjuries.count} injur{savedInjuries.count === 1 ? 'y' : 'ies'} recorded
                {savedInjuries.withBodyMap ? ' (with body map)' : ''}
              </p>
            )}
          </div>
          {saveWarning && (
            <p className="mt-4 rounded-md bg-warning/10 px-3 py-2 text-left text-sm text-warning">
              <AlertTriangle className="mr-1.5 inline h-4 w-4 align-text-bottom" aria-hidden />
              {saveWarning}
            </p>
          )}
        </div>

        <div className="mx-auto flex max-w-xl justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setSubmitted(null)
              setSaveWarning(null)
              setCategoryId('')
              setSubtypeId('')
              setAffectedKinds(['SERVICE_USER'])
              setServiceUserId('')
              setEmployeeId('')
              setAffectedPersonName('')
              setZoneId('')
              setLocationId('')
              setWitnesses([])
              setWitName('')
              setWitStatement('')
              setWitKind('EMPLOYEE')
              setPhotos([])
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
              setShareHandover(true)
              setOccurredAtLocal(null)
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
                  clearError('categoryId')
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
                onChange={(e) => {
                  setOccurredAtLocal(e.target.value)
                  clearError('occurredAt')
                }}
              />
            </FormField>

            <FormField label="Who was affected?">
              <MultiSelectDropdown
                options={INCIDENT_PERSON_KIND_OPTIONS}
                selected={affectedKinds}
                onChange={(next) => {
                  setAffectedKinds(next as IncidentPersonKind[])
                  // Clear fields that no longer apply so we never send stale values.
                  if (!next.includes('SERVICE_USER')) setServiceUserId('')
                  if (!next.includes('EMPLOYEE')) setEmployeeId('')
                  if (!next.some((k) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE'))
                    setAffectedPersonName('')
                }}
                placeholder="Select who was affected…"
              />
            </FormField>

            {affectedKinds.includes('SERVICE_USER') && (
              <FormField label="Service user affected" hint="Search by name">
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
            )}

            {affectedKinds.includes('EMPLOYEE') && (
              <FormField label="Staff member affected" hint="Search by name">
                <Combobox
                  options={employeeOptions}
                  value={employeeId}
                  onChange={setEmployeeId}
                  onSearchChange={setEmpSearch}
                  loading={employeesQuery.isLoading}
                  placeholder="Select staff member (optional)"
                  searchPlaceholder="Search staff…"
                  allowDeselect
                />
              </FormField>
            )}

            {affectedKinds.some((k) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE') && (
              <FormField label="Other person affected (name)" htmlFor="inc-affected-name">
                <Input
                  id="inc-affected-name"
                  value={affectedPersonName}
                  onChange={(e) => setAffectedPersonName(e.target.value)}
                  placeholder="Full name"
                />
              </FormField>
            )}

            <FormField label="Zone" htmlFor="inc-zone">
              <select
                id="inc-zone"
                value={zoneId}
                onChange={(e) => {
                  setZoneId(e.target.value)
                  setLocationId('')
                }}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={locationsQuery.isLoading}
              >
                <option value="">
                  {locationsQuery.isLoading ? 'Loading zones…' : 'Select zone…'}
                </option>
                {zoneOptions.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Branch" htmlFor="inc-location">
              <select
                id="inc-location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={!zoneId || locationsQuery.isLoading}
              >
                <option value="">
                  {!zoneId
                    ? 'Select zone first'
                    : branchOptions.length === 0
                      ? 'No branches in this zone'
                      : 'Select branch…'}
                </option>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Specific area / location" htmlFor="inc-area">
              <Input
                id="inc-area"
                value={specificArea}
                onChange={(e) => setSpecificArea(e.target.value)}
                placeholder="e.g. Bathroom, upstairs landing"
              />
            </FormField>

            <FormField
              label="Description"
              htmlFor="inc-desc"
              required
              error={errors.description}
              hint={
                description.length >= DESCRIPTION_COUNTER_FROM
                  ? `${description.length.toLocaleString()} / ${TEXT_MAX_LENGTH.toLocaleString()} characters`
                  : undefined
              }
              className="sm:col-span-2"
            >
              <Textarea
                id="inc-desc"
                rows={3}
                maxLength={TEXT_MAX_LENGTH}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  clearError('description')
                }}
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
                maxLength={TEXT_MAX_LENGTH}
                value={contextBefore}
                onChange={(e) => setContextBefore(e.target.value)}
              />
            </FormField>

            <FormField label="What happened afterwards?" htmlFor="inc-after" className="sm:col-span-2">
              <Textarea
                id="inc-after"
                rows={2}
                maxLength={TEXT_MAX_LENGTH}
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
              maxLength={TEXT_MAX_LENGTH}
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
          <h3 className="text-sm font-semibold text-foreground">Witnesses</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Anyone who saw what happened. Capture it now while it&apos;s fresh.
          </p>
          {witnesses.length > 0 && (
            <ul className="mb-3 space-y-2">
              {witnesses.map((w) => (
                <li
                  key={w.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                      {w.personName || 'Unnamed witness'}
                      <Badge variant="info" size="sm">
                        {INCIDENT_PERSON_KIND_OPTIONS.find((o) => o.value === w.personKind)?.label ??
                          w.personKind}
                      </Badge>
                    </p>
                    {w.statement && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{w.statement}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Remove witness"
                    onClick={() => removeWitness(w.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              placeholder="Witness name"
              value={witName}
              onChange={(e) => setWitName(e.target.value)}
            />
            <select
              value={witKind}
              onChange={(e) => setWitKind(e.target.value as IncidentPersonKind)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {INCIDENT_PERSON_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Textarea
              className="sm:col-span-2"
              rows={2}
              placeholder="What did they see? (optional)"
              value={witStatement}
              onChange={(e) => setWitStatement(e.target.value)}
            />
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={!witName.trim() && !witStatement.trim()}
              onClick={addWitness}
            >
              Add witness
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">Photos / evidence</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Attach photos of the injury or scene, or any supporting files.
          </p>
          {photos.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-3">
              {photos.map((p) => (
                <li key={p.id} className="relative">
                  <img
                    src={p.previewUrl}
                    alt={p.file.name}
                    className="h-20 w-20 rounded-lg border border-border object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removePhoto(p.id)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/40">
            <Paperclip className="h-4 w-4" />
            Add photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addPhotos(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
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
          <Button type="submit" loading={submitting}>
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
