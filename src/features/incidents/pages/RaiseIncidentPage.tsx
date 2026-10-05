import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, ChevronDown, FileText, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { Badge } from '@/shared/ui/badge'
import { InlineConfirm } from '@/shared/ui/inline-confirm'
import { toastApiError, toastWarning } from '@/shared/lib/toast'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { useIncidentCategories, useCreateIncident } from '@/features/incidents/hooks/useIncidents'
import { IncidentWitnessDialog } from '@/features/incidents/components/IncidentWitnessDialog'
import { IncidentVisitPicker, NOT_DURING_VISIT } from '@/features/incidents/components/IncidentVisitPicker'
import { IncidentStaffMultiSelect } from '@/features/incidents/components/IncidentStaffMultiSelect'
import { PickedChips } from '@/features/incidents/components/PickedChips'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import { nowOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import {
  IncidentCategoryDetailsFields,
  YesNoField,
} from '@/features/incidents/components/IncidentCategoryDetailsFields'
import {
  CATEGORY_DETAILS_TITLE,
  NO_HOSPITAL_OUTCOME_CATEGORIES,
  SKIN_SUBTYPE_INJURY_TYPE,
  SUBTYPE_HINTS,
  categoryDetailsForSubmit,
  validateCategoryDetails,
  type CategoryDetails,
} from '@/features/incidents/category-details'
import {
  INCIDENT_EVIDENCE_ACCEPT,
  canPreviewEvidence,
  formatFileSize,
  screenEvidenceFiles,
} from '@/features/incidents/utils/incident-evidence-files'
import {
  IncidentInjuryCaptureDialog,
  findInjuredPerson,
  type InjuredPersonOption,
} from '@/features/incidents/components/IncidentInjuryCaptureDialog'
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
  OFFICE_WHO_INFORMED_OPTIONS,
  INCIDENT_INJURY_SEVERITY_LABELS,
  INCIDENT_PERSON_KIND_OPTIONS,
  type CreateIncidentInput,
  type IncidentInjurySeverity,
  type IncidentVisitOption,
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

/** Reporter's first view of how serious it is — a manager confirms it at review. */
const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string; hint: string }[] = [
  { value: 'LOW', label: 'Low', hint: 'No or minimal harm, no treatment needed.' },
  { value: 'MEDIUM', label: 'Medium', hint: 'Minor harm: first aid or a GP visit, short-term effect.' },
  { value: 'HIGH', label: 'High', hint: 'Significant harm: hospital treatment, or a safeguarding concern.' },
  {
    value: 'CRITICAL',
    label: 'Critical',
    hint: 'Life-threatening or serious harm, death, or police involvement.',
  },
]

import { createClientUuid } from '@/shared/lib/create-client-uuid'

const INJURY_SEVERITY_BADGE: Record<IncidentInjurySeverity, 'info' | 'warning' | 'destructive'> = {
  MINOR: 'info',
  MODERATE: 'warning',
  SERIOUS: 'destructive',
  FATAL: 'destructive',
}

function newInjuryId(): string {
  return createClientUuid()
}

/** Matches the backend CreateIncidentDto @MaxLength(8000) on the free-text fields. */
const TEXT_MAX_LENGTH = 8000

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
        className="flex h-9 w-full items-center justify-between rounded-md border border-border bg-background px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={cn('truncate', selected.length ? 'text-foreground' : 'text-muted-foreground')}>
          {summary}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
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

/** "What kind of fall?"-style question for the subtype picker, based on the category name. */
function subtypeQuestion(category: { key: string; label: string }): string {
  if (category.key === 'OTHER') return 'Subtype'
  const name = category.label.toLowerCase()
  return /(incident|concern|accident|miss)$/.test(name)
    ? `What kind of ${name}?`
    : `What kind of ${name} incident?`
}

export default function RaiseIncidentPage() {
  const navigate = useNavigate()
  const categoriesQuery = useIncidentCategories()
  const createMutation = useCreateIncident()

  const [suSearch, setSuSearch] = React.useState('')
  const serviceUsersQuery = useServiceUsers({ limit: 50, search: suSearch || undefined })

  const [empSearch, setEmpSearch] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: empSearch || undefined })
  // Incidents are always reported by a carer; the office only records them on their behalf.
  const [reporterId, setReporterId] = React.useState('')
  const [reporterSearch, setReporterSearch] = React.useState('')
  const reportersQuery = useEmployees({ limit: 50, search: reporterSearch || undefined })
  const reporterOptions: ComboboxOption[] = React.useMemo(
    () =>
      (reportersQuery.data?.rows ?? []).map((r) => ({
        value: r.id,
        label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: r.jobTitle?.name ?? undefined,
      })),
    [reportersQuery.data],
  )
  /** '' = not chosen yet, NOT_DURING_VISIT, or a scheduled job id. */
  const [visitChoice, setVisitChoice] = React.useState('')
  const [selectedVisit, setSelectedVisit] = React.useState<IncidentVisitOption | null>(null)
  // Staff involved (made the error, alleged person, second carer…) — kept with names for the chips.
  const [involvedStaff, setInvolvedStaff] = React.useState<{ id: string; name: string }[]>([])
  const visitCarerSuggestions = (selectedVisit?.carers ?? []).filter(
    (c) => !involvedStaff.some((p) => p.id === c.employeeId),
  )
  function addInvolved(id: string, name: string) {
    if (!id || involvedStaff.some((p) => p.id === id)) return
    setInvolvedStaff((prev) => [...prev, { id, name }])
  }
  const locationsQuery = useServiceUserLocations()
  const { locationId: scopeLocationId } = useGlobalLocationScope()

  // Who was primarily affected — service user, staff, or another person (family/visitor/etc.).
  const [affectedKinds, setAffectedKinds] = React.useState<IncidentPersonKind[]>(['SERVICE_USER'])
  const [employeeId, setEmployeeId] = React.useState('')
  const [affectedPersonName, setAffectedPersonName] = React.useState('')
  const [locationId, setLocationId] = React.useState('')

  const [categoryId, setCategoryId] = React.useState('')
  const [subtypeId, setSubtypeId] = React.useState('')
  // null = not edited yet: default to "now" in the org timezone (recomputed once the org timezone
  // loads; the display-format context re-renders this page when it arrives).
  useOrganisationDisplayFormat()
  const [occurredAtEdited, setOccurredAtLocal] = React.useState<string | null>(null)
  const occurredAtLocal = occurredAtEdited ?? nowOrgDatetimeLocal()
  const [serviceUserId, setServiceUserId] = React.useState('')
  // Other service users involved (the first / primary one is `serviceUserId`).
  const [otherServiceUsers, setOtherServiceUsers] = React.useState<{ id: string; name: string }[]>([])
  const [otherSuSearch, setOtherSuSearch] = React.useState('')
  const otherSuQuery = useServiceUsers({ limit: 50, search: otherSuSearch || undefined })
  const otherSuOptions: ComboboxOption[] = React.useMemo(
    () =>
      (otherSuQuery.data?.rows ?? [])
        .filter((r) => r.id !== serviceUserId && !otherServiceUsers.some((p) => p.id === r.id))
        .map((r) => ({
          value: r.id,
          label: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
        })),
    [otherSuQuery.data, serviceUserId, otherServiceUsers],
  )
  const [description, setDescription] = React.useState('')
  const [contextBefore, setContextBefore] = React.useState('')
  const [contextAfter, setContextAfter] = React.useState('')
  const [immediateActions, setImmediateActions] = React.useState('')
  const [actionCodes, setActionCodes] = React.useState<string[]>([])
  const [whoInformed, setWhoInformed] = React.useState<string[]>([])
  const [injuries, setInjuries] = React.useState<PendingIncidentInjury[]>([])
  const [injuryDialogOpen, setInjuryDialogOpen] = React.useState(false)
  const [editingInjury, setEditingInjury] = React.useState<PendingIncidentInjury | null>(null)
  // Names of the picked people, kept so the injury picker can label them even after the search list changes.
  const [serviceUserName, setServiceUserName] = React.useState('')
  const [employeeName, setEmployeeName] = React.useState('')
  // Witnesses (persisted after the incident is created).
  const [witnesses, setWitnesses] = React.useState<PendingWitness[]>([])
  const [witnessDialogOpen, setWitnessDialogOpen] = React.useState(false)
  const [editingWitness, setEditingWitness] = React.useState<PendingWitness | null>(null)
  // Photos / evidence (uploaded after the incident is created).
  const [photos, setPhotos] = React.useState<PendingPhoto[]>([])
  const [photoErrors, setPhotoErrors] = React.useState<string[]>([])
  const photoInputRef = React.useRef<HTMLInputElement>(null)
  // Covers the whole save (incident + injuries + witnesses + uploads) so Submit can't be clicked twice.
  const [submitting, setSubmitting] = React.useState(false)
  // Blocks rapid repeat clicks that land before React re-renders the disabled button.
  const submittingRef = React.useRef(false)
  const [severity, setSeverity] = React.useState<IncidentSeverity | ''>('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [submitted, setSubmitted] = React.useState<IncidentListItem | null>(null)

  const categories = categoriesQuery.data ?? []
  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null
  const isBehaviour = selectedCategory?.key === 'BEHAVIOUR'
  const categoryKey = selectedCategory?.key
  const subtypeKey = selectedCategory?.subtypes.find((s) => s.id === subtypeId)?.key
  // Category-specific answers — cleared whenever the category changes.
  const [categoryDetails, setCategoryDetails] = React.useState<CategoryDetails>({})
  const [detailErrors, setDetailErrors] = React.useState<Record<string, string>>({})
  // Hospital outcome at raise: null = "Not known" (e.g. reported by phone).
  const [ambulanceAttended, setAmbulanceAttended] = React.useState<boolean | null>(null)
  const [takenToAe, setTakenToAe] = React.useState<boolean | null>(null)
  const [admittedToHospital, setAdmittedToHospital] = React.useState<boolean | null>(null)
  const [injuryPreset, setInjuryPreset] = React.useState<{ personKey?: string; injuryType?: string } | null>(null)
  const showHospitalOutcome =
    affectedKinds.length > 0 && !(categoryKey && NO_HOSPITAL_OUTCOME_CATEGORIES.has(categoryKey))

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

  const branchIds = React.useMemo(
    () => new Set(zoneOptions.flatMap((z) => z.branches.map((b) => b.id))),
    [zoneOptions],
  )

  // Start on the branch picked in the top bar (when it is a real branch).
  React.useEffect(() => {
    if (!locationId && scopeLocationId && branchIds.has(scopeLocationId)) {
      setLocationId(scopeLocationId)
    }
  }, [scopeLocationId, branchIds, locationId])

  /** Picking a service user also sets the branch to theirs. */
  function selectServiceUser(id: string) {
    setServiceUserId(id)
    setVisitChoice('')
    setServiceUserName(serviceUserOptions.find((o) => o.value === id)?.label ?? '')
    const branchId = serviceUsersQuery.data?.rows.find((r) => r.id === id)?.location?.id
    if (branchId && branchIds.has(branchId)) setLocationId(branchId)
  }

  const visitServiceUserId = affectedKinds.includes('SERVICE_USER') ? serviceUserId : ''
  const visitEmployeeId = (affectedKinds.includes('EMPLOYEE') && employeeId) || reporterId
  const canPickVisit = Boolean(occurredAtLocal && (visitServiceUserId || visitEmployeeId))

  const subtypeLabel = selectedCategory ? subtypeQuestion(selectedCategory) : 'Subtype'

  // Free any created object URLs when the form unmounts (ref keeps the latest list).
  const photosRef = React.useRef<PendingPhoto[]>([])
  photosRef.current = photos
  React.useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    }
  }, [])

  function saveWitness(witness: PendingWitness) {
    setWitnesses((prev) =>
      prev.some((w) => w.id === witness.id) ? prev.map((w) => (w.id === witness.id ? witness : w)) : [...prev, witness],
    )
  }

  function openWitnessDialog(witness: PendingWitness | null) {
    setEditingWitness(witness)
    setWitnessDialogOpen(true)
  }

  function removeWitness(id: string) {
    setWitnesses((prev) => prev.filter((w) => w.id !== id))
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return
    const { accepted, errors } = screenEvidenceFiles(
      Array.from(files),
      photos.map((p) => p.file),
    )
    setPhotoErrors(errors)
    if (accepted.length === 0) return
    const next: PendingPhoto[] = accepted.map((file) => ({
      id: newInjuryId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    setPhotos((prev) => [...prev, ...next])
  }

  function removePhoto(id: string) {
    const target = photos.find((p) => p.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    setPhotoErrors([])
  }

  /** People named under "Who was affected?" — the only ones an injury can be recorded against. */
  const injuredPeople = React.useMemo<InjuredPersonOption[]>(() => {
    const people: InjuredPersonOption[] = []
    if (affectedKinds.includes('SERVICE_USER') && serviceUserId) {
      people.push({
        key: `SERVICE_USER:${serviceUserId}`,
        kind: 'SERVICE_USER',
        serviceUserId,
        label: `${serviceUserName || 'Service user'} (Service user)`,
      })
    }
    if (affectedKinds.includes('EMPLOYEE') && employeeId) {
      people.push({
        key: `EMPLOYEE:${employeeId}`,
        kind: 'EMPLOYEE',
        employeeId,
        label: `${employeeName || 'Staff member'} (Staff member)`,
      })
    }
    const otherKind = affectedKinds.find((k) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE')
    const otherName = affectedPersonName.trim()
    if (otherKind && otherName) {
      const kindLabel = INCIDENT_PERSON_KIND_OPTIONS.find((o) => o.value === otherKind)?.label ?? 'Other'
      people.push({
        key: `${otherKind}:${otherName.toLowerCase()}`,
        kind: otherKind,
        name: otherName,
        label: `${otherName} (${kindLabel})`,
      })
    }
    return people
  }, [affectedKinds, serviceUserId, serviceUserName, employeeId, employeeName, affectedPersonName])

  function saveInjury(injury: PendingIncidentInjury) {
    setInjuries((prev) =>
      prev.some((i) => i.id === injury.id) ? prev.map((i) => (i.id === injury.id ? injury : i)) : [...prev, injury],
    )
  }

  function openInjuryDialog(injury: PendingIncidentInjury | null) {
    setEditingInjury(injury)
    setInjuryPreset(null)
    setInjuryDialogOpen(true)
  }

  // Skin / wound subtypes need a body-map pin for the service user (body map is SU-only).
  const skinInjuryType = categoryKey === 'SKIN_WOUND' && subtypeKey ? SKIN_SUBTYPE_INJURY_TYPE[subtypeKey] : undefined
  const bodyMapNeeded = Boolean(skinInjuryType && affectedKinds.includes('SERVICE_USER') && serviceUserId)
  const bodyMapPinned = injuries.some(
    (i) => (i.personKind ?? 'SERVICE_USER') === 'SERVICE_USER' && i.personServiceUserId === serviceUserId && i.marker,
  )
  function openSkinBodyMap() {
    setEditingInjury(null)
    setInjuryPreset({ personKey: `SERVICE_USER:${serviceUserId}`, injuryType: skinInjuryType })
    setInjuryDialogOpen(true)
  }

  function removeInjury(id: string) {
    setInjuries((prev) => prev.filter((i) => i.id !== id))
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!reporterId) next.reporterId = 'Select the carer who reported it'
    if (!categoryId) next.categoryId = 'Select what you are reporting'
    const occurredIso = occurredAtLocal ? orgDatetimeLocalToIso(occurredAtLocal) : ''
    if (!occurredIso) next.occurredAt = 'Enter the date and time'
    else if (Date.parse(occurredIso) > Date.now() + 60_000)
      next.occurredAt = 'The date/time cannot be in the future'
    if (affectedKinds.includes('SERVICE_USER') && !serviceUserId)
      next.serviceUserId = 'Select the service user'
    if (affectedKinds.includes('EMPLOYEE') && !employeeId)
      next.employeeId = 'Select the staff member'
    if (affectedKinds.some((k) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE') && !affectedPersonName.trim())
      next.affectedPersonName = 'Enter the name of the person affected'
    if (!description.trim()) next.description = 'Describe what happened'
    if (!severity) next.severity = 'Select how serious it is'
    if (canPickVisit && !visitChoice) next.visit = 'Choose the visit, or "Not during a visit"'
    if (injuries.some((inj) => !findInjuredPerson(inj, injuredPeople)))
      next.injuries = 'An injury is linked to someone no longer listed under "Who was affected?". Edit or remove it.'
    if (actionCodes.includes('OTHER') && !immediateActions.trim())
      next.immediateActions = 'Describe the other action taken'
    const cdErrors = validateCategoryDetails(categoryKey, subtypeKey, categoryDetails, {
      hasLinkedVisit: Boolean(visitChoice && visitChoice !== NOT_DURING_VISIT),
      today: new Date().toISOString().slice(0, 10),
    })
    if (bodyMapNeeded && !bodyMapPinned) cdErrors.bodyMap = 'Mark it on the body map'
    setDetailErrors(cdErrors)
    setErrors(next)
    return Object.keys(next).length === 0 && Object.keys(cdErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submittingRef.current || !validate()) return
    submittingRef.current = true
    setSubmitting(true)
    const affectedSu = affectedKinds.includes('SERVICE_USER') ? serviceUserId : ''
    const affectedStaff = affectedKinds.includes('EMPLOYEE') ? employeeId : ''
    // Everyone involved, primary person first (other staff / service users follow).
    const allServiceUserIds = [...new Set([affectedSu, ...otherServiceUsers.map((p) => p.id)].filter(Boolean))]
    const allEmployeeIds = [...new Set([affectedStaff, ...involvedStaff.map((p) => p.id)].filter(Boolean))]
    const input: CreateIncidentInput = {
      categoryId,
      subtypeId: subtypeId || undefined,
      occurredAt: orgDatetimeLocalToIso(occurredAtLocal),
      primaryServiceUserId: affectedSu || undefined,
      primaryEmployeeId: affectedStaff || undefined,
      serviceUserIds: allServiceUserIds.length ? allServiceUserIds : undefined,
      employeeIds: allEmployeeIds.length ? allEmployeeIds : undefined,
      affectedPersonKinds: affectedKinds.length ? affectedKinds : undefined,
      primaryPersonKind: affectedKinds[0],
      primaryPersonName: affectedKinds.some(
        (k) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE',
      )
        ? affectedPersonName.trim() || undefined
        : undefined,
      locationId: locationId || undefined,
      description: description.trim(),
      contextBefore: contextBefore.trim() || undefined,
      contextAfter: contextAfter.trim() || undefined,
      immediateActions: immediateActions.trim() || undefined,
      immediateActionCodes: actionCodes.length ? actionCodes : undefined,
      whoInformedKeys: whoInformed.length ? whoInformed : undefined,
      // "Injury: yes" whenever at least one injury was added.
      injuryOccurred: injuries.length > 0,
      severity: severity || undefined,
      reporterEmployeeId: reporterId,
      scheduledJobId: visitChoice && visitChoice !== NOT_DURING_VISIT ? visitChoice : undefined,
      categoryDetails: categoryDetailsForSubmit(categoryKey, {
        ...categoryDetails,
        // Only meaningful when no visit was linked.
        noMatchingVisitReason:
          visitChoice === NOT_DURING_VISIT ? categoryDetails.noMatchingVisitReason : undefined,
      }),
      ...(showHospitalOutcome ? { ambulanceAttended, takenToAe, admittedToHospital } : {}),
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
      const failedPhotos: string[] = []
      for (const photo of photos) {
        try {
          await persistIncidentPhoto(created.id, photo.file)
        } catch {
          failedPhotos.push(photo.file.name)
        }
      }
      const failureParts: string[] = []
      if (injuryFailures > 0) failureParts.push(`${injuryFailures} injury detail(s)`)
      if (witnessFailures > 0) failureParts.push(`${witnessFailures} witness(es)`)
      if (failedPhotos.length > 0)
        failureParts.push(
          `${failedPhotos.length} file${failedPhotos.length === 1 ? '' : 's'} (${failedPhotos.join(', ')})`,
        )
      if (failureParts.length > 0) {
        toastWarning(
          'Incident saved with missing details',
          `${failureParts.join(', ')} could not be recorded. Add them on the incident record.`,
        )
      }
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl))
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
              setAffectedKinds(['SERVICE_USER'])
              setServiceUserId('')
              setServiceUserName('')
              setEmployeeId('')
              setEmployeeName('')
              setAffectedPersonName('')
              setLocationId(scopeLocationId && branchIds.has(scopeLocationId) ? scopeLocationId : '')
              setWitnesses([])
              setPhotos([])
              setPhotoErrors([])
              setDescription('')
              setContextBefore('')
              setContextAfter('')
              setImmediateActions('')
              setActionCodes([])
              setWhoInformed([])
              setInjuries([])
              setSeverity('')
              setReporterId('')
              setVisitChoice('')
              setInvolvedStaff([])
              setCategoryDetails({})
              setDetailErrors({})
              setAmbulanceAttended(null)
              setTakenToAe(null)
              setAdmittedToHospital(null)
              setOccurredAtLocal(null)
              setOtherServiceUsers([])
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
        description="Record the facts as soon as possible. A manager will review and investigate."
        icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Accident & Incident' },
          { label: 'Raise' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Incident details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Reported by (carer)"
              required
              error={errors.reporterId}
              hint="The carer who reported it — you are recording it on their behalf."
              className="sm:col-span-2"
            >
              <Combobox
                options={reporterOptions}
                value={reporterId}
                onChange={(id) => {
                  setReporterId(id)
                  setVisitChoice('')
                }}
                onSearchChange={setReporterSearch}
                loading={reportersQuery.isLoading}
                error={Boolean(errors.reporterId)}
                placeholder="Search carer…"
                searchPlaceholder="Search staff…"
                className="sm:max-w-md"
              />
            </FormField>

            <FormField label="Incident category" htmlFor="inc-category" required error={errors.categoryId}>
              <select
                id="inc-category"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value)
                  setCategoryDetails({})
                  setDetailErrors({})
                  setSubtypeId('')
                }}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              <FormField label={subtypeLabel} htmlFor="inc-subtype">
                <select
                  id="inc-subtype"
                  value={subtypeId}
                  onChange={(e) => setSubtypeId(e.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select…</option>
                  {selectedCategory.subtypes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                {categoryKey && SUBTYPE_HINTS[categoryKey] && (
                  <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    {Object.entries(SUBTYPE_HINTS[categoryKey])
                      .filter(([key]) => !subtypeKey || key === subtypeKey)
                      .map(([key, hint]) => (
                        <li key={key}>{hint}</li>
                      ))}
                  </ul>
                )}
              </FormField>
            )}

            <FormField label="When did it happen?" htmlFor="inc-when" required error={errors.occurredAt}>
              <Input
                id="inc-when"
                type="datetime-local"
                value={occurredAtLocal}
                onChange={(e) => {
                  setOccurredAtLocal(e.target.value)
                  setVisitChoice('')
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
              <FormField label="Service user" required error={errors.serviceUserId}>
                <Combobox
                  options={serviceUserOptions}
                  value={serviceUserId}
                  onChange={selectServiceUser}
                  onSearchChange={setSuSearch}
                  loading={serviceUsersQuery.isLoading}
                  error={Boolean(errors.serviceUserId)}
                  placeholder="Search service user…"
                  searchPlaceholder="Search service users…"
                  allowDeselect
                />
              </FormField>
            )}

            {affectedKinds.includes('EMPLOYEE') && (
              <FormField label="Staff member" required error={errors.employeeId}>
                <Combobox
                  options={employeeOptions}
                  value={employeeId}
                  onChange={(id) => {
                    setEmployeeId(id)
                    setEmployeeName(employeeOptions.find((o) => o.value === id)?.label ?? '')
                  }}
                  onSearchChange={setEmpSearch}
                  loading={employeesQuery.isLoading}
                  error={Boolean(errors.employeeId)}
                  placeholder="Search staff…"
                  searchPlaceholder="Search staff…"
                  allowDeselect
                />
              </FormField>
            )}

            {affectedKinds.some((k) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE') && (
              <FormField label="Name of person affected" htmlFor="inc-affected-name" required error={errors.affectedPersonName}>
                <Input
                  id="inc-affected-name"
                  value={affectedPersonName}
                  onChange={(e) => setAffectedPersonName(e.target.value)}
                  placeholder="Full name"
                />
              </FormField>
            )}

            <FormField label="Branch" htmlFor="inc-location" hint="Branch responsible for this incident">
              <select
                id="inc-location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={locationsQuery.isLoading}
              >
                <option value="">{locationsQuery.isLoading ? 'Loading branches…' : 'Select branch…'}</option>
                {zoneOptions
                  .filter((zone) => zone.branches.length > 0)
                  .map((zone) => (
                    <optgroup key={zone.id} label={zone.name}>
                      {zone.branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </FormField>

            <FormField
              label="Visit (where it happened or was discovered)"
              required={canPickVisit}
              className="sm:col-span-2"
            >
              {canPickVisit ? (
                <IncidentVisitPicker
                  serviceUserId={visitServiceUserId || undefined}
                  employeeId={visitServiceUserId ? undefined : visitEmployeeId || undefined}
                  incidentAt={occurredAtLocal}
                  reporterEmployeeId={reporterId || undefined}
                  value={visitChoice}
                  onChange={setVisitChoice}
                  onSelectedVisitChange={setSelectedVisit}
                  noVisitLabel={categoryKey === 'CARE_DELIVERY' ? 'No matching visit found' : undefined}
                  error={errors.visit}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select the carer or the person affected to choose a visit.
                </p>
              )}
            </FormField>

            <FormField label="Other staff involved" className="sm:col-span-2">
              <div className="space-y-2">
                {involvedStaff.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {involvedStaff.map((p) => (
                      <li
                        key={p.id}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 py-1 pl-3 pr-1 text-sm text-foreground"
                      >
                        {p.name}
                        {p.id === reporterId && <span className="text-muted-foreground">(reporter)</span>}
                        <button
                          type="button"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => setInvolvedStaff((prev) => prev.filter((x) => x.id !== p.id))}
                          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="sm:max-w-md">
                  <IncidentStaffMultiSelect
                    selected={involvedStaff}
                    onChange={setInvolvedStaff}
                    placeholder="Select staff…"
                  />
                </div>
                {visitCarerSuggestions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Carers on this visit:</span>
                    {visitCarerSuggestions.map((c) => (
                      <button
                        key={c.employeeId}
                        type="button"
                        onClick={() => addInvolved(c.employeeId, c.name)}
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-foreground hover:bg-muted/40"
                      >
                        <Plus className="h-3 w-3" aria-hidden /> {c.name}
                        {c.employeeId === reporterId ? ' (reporter)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FormField>

            <FormField label="Other service users involved" className="sm:col-span-2">
              <div className="sm:max-w-md">
                <Combobox
                  options={otherSuOptions}
                  value=""
                  onChange={(id) => {
                    const name = otherSuOptions.find((o) => o.value === id)?.label
                    if (id && name) setOtherServiceUsers((prev) => [...prev, { id, name }])
                  }}
                  onSearchChange={setOtherSuSearch}
                  loading={otherSuQuery.isLoading}
                  placeholder="Add service user…"
                  searchPlaceholder="Search service users…"
                />
              </div>
              <PickedChips
                items={otherServiceUsers.map((p) => ({ id: p.id, label: p.name }))}
                onRemove={(id) => setOtherServiceUsers((prev) => prev.filter((p) => p.id !== id))}
              />
            </FormField>

            <FormField label="What happened?" htmlFor="inc-desc" required error={errors.description} className="sm:col-span-2">
              <Textarea
                id="inc-desc"
                maxLength={TEXT_MAX_LENGTH}
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the facts: what you saw or were told, in order. Avoid opinions."
              />
            </FormField>

            <FormField
              label={isBehaviour ? 'Possible triggers' : 'What was happening just before?'}
              htmlFor="inc-before"
              className="sm:col-span-2"
            >
              <Textarea
                id="inc-before"
                maxLength={TEXT_MAX_LENGTH}
                rows={2}
                value={contextBefore}
                onChange={(e) => setContextBefore(e.target.value)}
              />
            </FormField>

            <FormField label="What was done?">
              <MultiSelectDropdown
                options={IMMEDIATE_ACTION_OPTIONS}
                selected={actionCodes}
                onChange={(next) => {
                  // "No action needed" can't sit alongside real actions — keep whichever was just picked.
                  const added = next.find((c) => !actionCodes.includes(c))
                  setActionCodes(
                    added === 'NO_ACTION_NEEDED'
                      ? ['NO_ACTION_NEEDED']
                      : next.filter((c) => c !== 'NO_ACTION_NEEDED'),
                  )
                }}
                placeholder="Select actions…"
              />
            </FormField>
            <FormField label="Who was informed?">
              <MultiSelectDropdown
                options={OFFICE_WHO_INFORMED_OPTIONS}
                selected={whoInformed}
                onChange={(next) => {
                  // "No one informed yet" can't sit alongside named people — keep whichever was just picked.
                  const added = next.find((k) => !whoInformed.includes(k))
                  setWhoInformed(
                    added === 'no_one_yet' ? ['no_one_yet'] : next.filter((k) => k !== 'no_one_yet'),
                  )
                }}
                placeholder="Select who was told…"
              />
            </FormField>
            <FormField
              label="Describe the actions taken"
              htmlFor="inc-actions"
              required={actionCodes.includes('OTHER')}
              error={errors.immediateActions}
              className="sm:col-span-2"
            >
              <Textarea
                id="inc-actions"
                maxLength={TEXT_MAX_LENGTH}
                rows={2}
                value={immediateActions}
                onChange={(e) => setImmediateActions(e.target.value)}
                placeholder="e.g. helped up with hoist, cleaned and dressed graze, stayed until settled"
              />
            </FormField>

            <FormField label="What happened afterwards?" htmlFor="inc-after" className="sm:col-span-2">
              <Textarea
                id="inc-after"
                maxLength={TEXT_MAX_LENGTH}
                rows={2}
                value={contextAfter}
                onChange={(e) => setContextAfter(e.target.value)}
                placeholder="e.g. person calm and settled, resting in bed, taken to hospital"
              />
            </FormField>

            {showHospitalOutcome && (
              <div className="space-y-3 sm:col-span-2">
                <p className="text-sm font-medium text-foreground">Hospital outcome</p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <FormField label="Ambulance attended?">
                    <YesNoField name="inc-ambulance" allowUnknown value={ambulanceAttended} onChange={setAmbulanceAttended} />
                  </FormField>
                  <FormField label="Taken to A&E?">
                    <YesNoField name="inc-ae" allowUnknown value={takenToAe} onChange={setTakenToAe} />
                  </FormField>
                  <FormField label="Admitted to hospital?">
                    <YesNoField
                      name="inc-admitted"
                      allowUnknown
                      value={admittedToHospital}
                      onChange={setAdmittedToHospital}
                    />
                  </FormField>
                </div>
              </div>
            )}
          </div>
        </div>

        {categoryKey && CATEGORY_DETAILS_TITLE[categoryKey] && (
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">{CATEGORY_DETAILS_TITLE[categoryKey]}</h3>
            <IncidentCategoryDetailsFields
              categoryKey={categoryKey}
              subtypeKey={subtypeKey}
              value={categoryDetails}
              onChange={setCategoryDetails}
              errors={detailErrors}
              serviceUserId={affectedKinds.includes('SERVICE_USER') ? serviceUserId || undefined : undefined}
              selectedVisit={selectedVisit && visitChoice === selectedVisit.scheduledJobId ? selectedVisit : null}
              visitLinked={visitChoice !== NOT_DURING_VISIT}
              bodyMap={
                bodyMapNeeded
                  ? { needed: true, pinned: bodyMapPinned, onAdd: openSkinBodyMap, error: detailErrors.bodyMap }
                  : undefined
              }
            />
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Injuries</h3>
          <div className="space-y-3">
              {injuries.length === 0 && <p className="text-sm text-muted-foreground">No injuries recorded.</p>}
              {injuries.length > 0 && (
                <ul className="space-y-2">
                  {injuries.map((inj) => {
                    const listed = findInjuredPerson(inj, injuredPeople)
                    return (
                      <li
                        key={inj.id}
                        className={cn(
                          'flex items-start justify-between gap-3 rounded-lg border bg-muted/20 p-3 sm:p-4',
                          listed ? 'border-border' : 'border-destructive',
                        )}
                      >
                        <div className="min-w-0 space-y-2">
                          <dl className="grid grid-cols-[6.5rem_1fr] items-center gap-x-3 gap-y-1.5 text-sm">
                            <dt className="text-muted-foreground">Injury type</dt>
                            <dd className="font-semibold text-foreground">{inj.injuryType}</dd>
                            <dt className="text-muted-foreground">Severity</dt>
                            <dd>
                              <Badge variant={INJURY_SEVERITY_BADGE[inj.severity]} size="sm">
                                {INCIDENT_INJURY_SEVERITY_LABELS[inj.severity]}
                              </Badge>
                            </dd>
                            <dt className="text-muted-foreground">Person</dt>
                            <dd className="text-foreground">{listed?.label ?? inj.personLabel ?? 'Unknown person'}</dd>
                            {inj.marker && (
                              <>
                                <dt className="text-muted-foreground">Body map</dt>
                                <dd className="flex items-center gap-1 text-foreground">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                                  {inj.marker.summaryLabel || inj.marker.bodyPart}
                                </dd>
                              </>
                            )}
                            {inj.notes && (
                              <>
                                <dt className="text-muted-foreground">Notes</dt>
                                <dd className="whitespace-pre-wrap break-words text-foreground">{inj.notes}</dd>
                              </>
                            )}
                          </dl>
                          {!listed && (
                            <p className="text-xs font-medium text-destructive dark:text-red-400">
                              This person is no longer listed under “Who was affected?”.
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label="Edit injury"
                            onClick={() => openInjuryDialog(inj)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <InlineConfirm
                            title="Remove this injury?"
                            description={`${inj.injuryType} — ${listed?.label ?? inj.personLabel ?? 'Unknown person'}`}
                            confirmLabel="Yes, remove"
                            cancelLabel="No"
                            destructive
                            onConfirm={() => removeInjury(inj.id)}
                          >
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              aria-label="Remove injury"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </InlineConfirm>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              {injuredPeople.length > 0 ? (
                <Button type="button" variant="outline" size="sm" onClick={() => openInjuryDialog(null)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add injury
                </Button>
              ) : (
                <p className="text-xs text-warning">
                  Choose who was affected above (and select the person) to record their injuries.
                </p>
              )}
              {errors.injuries && (
                <p className="text-xs font-medium text-destructive dark:text-red-400">{errors.injuries}</p>
              )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">Witnesses</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Anyone who saw what happened. Capture it now while it&apos;s fresh.
          </p>
          <div className="space-y-3">
            {witnesses.length === 0 && <p className="text-sm text-muted-foreground">No witnesses recorded.</p>}
            {witnesses.length > 0 && (
              <ul className="space-y-2">
                {witnesses.map((w) => (
                  <li
                    key={w.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:p-4"
                  >
                    <dl className="grid min-w-0 grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="font-semibold text-foreground">{w.personName || 'Unnamed witness'}</dd>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="text-foreground">
                        {INCIDENT_PERSON_KIND_OPTIONS.find((o) => o.value === w.personKind)?.label ?? w.personKind}
                      </dd>
                      {w.statement && (
                        <>
                          <dt className="text-muted-foreground">Statement</dt>
                          <dd className="whitespace-pre-wrap break-words text-foreground">{w.statement}</dd>
                        </>
                      )}
                    </dl>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Edit witness"
                        onClick={() => openWitnessDialog(w)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <InlineConfirm
                        title="Remove this witness?"
                        description={w.personName || 'Unnamed witness'}
                        confirmLabel="Yes, remove"
                        cancelLabel="No"
                        destructive
                        onConfirm={() => removeWitness(w.id)}
                      >
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label="Remove witness"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </InlineConfirm>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" variant="outline" size="sm" onClick={() => openWitnessDialog(null)}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add witness
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">Photos / evidence</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Photos of the injury or scene, or supporting documents. JPEG, PNG, WebP, HEIC or PDF, up to 10 MB each.
          </p>
          <div className="space-y-3">
            {photos.length === 0 && <p className="text-sm text-muted-foreground">No photos or files added.</p>}
            {photos.length > 0 && (
              <ul className="space-y-2">
                {photos.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-2 sm:p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {canPreviewEvidence(p.file) ? (
                        <img
                          src={p.previewUrl}
                          alt=""
                          className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground"
                          aria-hidden
                        >
                          <FileText className="h-5 w-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{p.file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(p.file.size)}</p>
                      </div>
                    </div>
                    <InlineConfirm
                      title="Remove this file?"
                      description={p.file.name}
                      confirmLabel="Yes, remove"
                      cancelLabel="No"
                      destructive
                      onConfirm={() => removePhoto(p.id)}
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove ${p.file.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </InlineConfirm>
                  </li>
                ))}
              </ul>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept={INCIDENT_EVIDENCE_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                addPhotos(e.target.files)
                e.target.value = ''
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => photoInputRef.current?.click()}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add photos or files
            </Button>
            {photoErrors.length > 0 && (
              <ul className="space-y-0.5" role="alert">
                {photoErrors.map((err) => (
                  <li key={err} className="text-xs font-medium text-destructive dark:text-red-400">
                    {err}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Severity</h3>
          <fieldset aria-describedby="inc-sev-hint">
            <legend className="mb-2 text-sm font-medium text-foreground">
              How serious is it?<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
            </legend>
            <div className="space-y-2" role="radiogroup">
              {SEVERITY_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm hover:bg-muted/40',
                    severity === o.value ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="inc-severity"
                    value={o.value}
                    checked={severity === o.value}
                    onChange={() => setSeverity(o.value)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-foreground">
                    <span className="font-semibold">{o.label}</span>{' '}
                    <span className="text-muted-foreground">({o.hint.replace(/\.$/, '')})</span>
                  </span>
                </label>
              ))}
            </div>
            <p id="inc-sev-hint" className="mt-2 text-xs text-muted-foreground">
              A manager will confirm the severity during review.
            </p>
            {errors.severity && (
              <p className="mt-1 text-xs font-medium text-destructive dark:text-red-400">{errors.severity}</p>
            )}
          </fieldset>
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

      <IncidentWitnessDialog
        open={witnessDialogOpen}
        onOpenChange={setWitnessDialogOpen}
        initial={editingWitness}
        onSave={saveWitness}
      />

      <IncidentInjuryCaptureDialog
        open={injuryDialogOpen}
        onOpenChange={setInjuryDialogOpen}
        people={injuredPeople}
        initial={editingInjury}
        preset={injuryPreset}
        onCapture={saveInjury}
      />
    </div>
  )
}
