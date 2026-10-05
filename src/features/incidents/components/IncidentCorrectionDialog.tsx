import * as React from 'react'
import { Button } from '@/shared/ui/button'
import { FormField, Textarea } from '@/shared/ui/form-field'
import { Input } from '@/shared/ui/input'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { extractApiErrorMessage } from '@/shared/lib/toast'
import { isoToOrgDatetimeLocal, orgDatetimeLocalToIso } from '@/shared/lib/operational-day.util'
import { useServiceUsers } from '@/features/service-users/hooks/useServiceUsers'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useServiceUserLocations } from '@/features/settings/hooks/useLocationManagement'
import { useCorrectIncident, useIncidentCategories } from '@/features/incidents/hooks/useIncidents'
import { IncidentVisitPicker, NOT_DURING_VISIT } from '@/features/incidents/components/IncidentVisitPicker'
import { IncidentStaffMultiSelect } from '@/features/incidents/components/IncidentStaffMultiSelect'
import { PickedChips } from '@/features/incidents/components/PickedChips'
import {
  IncidentCategoryDetailsFields,
  YesNoField,
} from '@/features/incidents/components/IncidentCategoryDetailsFields'
import {
  INCIDENT_SEVERITY_FORM_OPTIONS,
  MultiSelectDropdown,
  subtypeQuestion,
} from '@/features/incidents/components/IncidentFormControls'
import {
  CATEGORY_DETAILS_TITLE,
  NO_HOSPITAL_OUTCOME_CATEGORIES,
  SUBTYPE_HINTS,
  categoryDetailsForSubmit,
  validateCategoryDetails,
  type CategoryDetails,
} from '@/features/incidents/category-details'
import {
  IMMEDIATE_ACTION_OPTIONS,
  INCIDENT_PERSON_KIND_OPTIONS,
  OFFICE_WHO_INFORMED_OPTIONS,
  type CorrectIncidentInput,
  type IncidentDetail,
  type IncidentPersonKind,
  type IncidentSeverity,
  type IncidentVisitOption,
} from '@/features/incidents/types'

type Person = { id: string; name: string }

const selectClass =
  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x))
const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])
const isOtherKind = (k: string) => k !== 'SERVICE_USER' && k !== 'EMPLOYEE'

/** Values the form starts from (the incident as it is now). */
function initialState(incident: IncidentDetail) {
  const sus = incident.involvedServiceUsers ?? []
  const emps = incident.involvedEmployees ?? []
  return {
    occurredLocal: isoToOrgDatetimeLocal(incident.occurredAt),
    categoryId: incident.category.id,
    subtypeId: incident.subtype?.id ?? '',
    kinds: incident.affectedPersonKinds,
    serviceUserId: incident.primaryServiceUserId ?? '',
    employeeId: incident.primaryEmployeeId ?? '',
    otherName: incident.primaryPersonName ?? '',
    otherSus: sus
      .filter((s) => s.id !== incident.primaryServiceUserId)
      .map((s) => ({ id: s.id, name: s.name ?? 'Service user' })),
    otherStaff: emps
      .filter((e) => e.id !== incident.primaryEmployeeId)
      .map((e) => ({ id: e.id, name: e.name ?? 'Staff member' })),
    locationId: incident.locationId ?? '',
    visitChoice: incident.scheduledJobId ?? NOT_DURING_VISIT,
    details: (incident.categoryDetails ?? {}) as CategoryDetails,
    ambulanceAttended: incident.ambulanceAttended ?? null,
    takenToAe: incident.takenToAe ?? null,
    admittedToHospital: incident.admittedToHospital ?? null,
    actionCodes: incident.immediateActionCodes,
    whoInformed: incident.whoInformedKeys,
    severity: incident.severity,
  }
}

/**
 * Correct the raised details (manager only, with a reason). Only fields that can be corrected are
 * here; the reporter's own account is never edited (add a clarification note instead).
 */
export function IncidentCorrectionDialog({
  incident,
  open,
  onOpenChange,
}: {
  incident: IncidentDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const correct = useCorrectIncident(incident.id)
  const categoriesQuery = useIncidentCategories()
  const locationsQuery = useServiceUserLocations()
  const [suSearch, setSuSearch] = React.useState('')
  const [otherSuSearch, setOtherSuSearch] = React.useState('')
  const [empSearch, setEmpSearch] = React.useState('')
  const serviceUsersQuery = useServiceUsers({ limit: 50, search: suSearch || undefined })
  const otherSuQuery = useServiceUsers({ limit: 50, search: otherSuSearch || undefined })
  const employeesQuery = useEmployees({ limit: 50, search: empSearch || undefined })

  const start = React.useMemo(() => initialState(incident), [incident])
  const [form, setForm] = React.useState(start)
  const [reason, setReason] = React.useState('')
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [detailErrors, setDetailErrors] = React.useState<Record<string, string>>({})
  const [selectedVisit, setSelectedVisit] = React.useState<IncidentVisitOption | null>(null)
  /** Shown next to Save so a problem is never off-screen (validation or API). */
  const [problem, setProblem] = React.useState<string | null>(null)
  const bodyRef = React.useRef<HTMLDivElement>(null)

  // Start again from the current incident each time the dialog opens.
  React.useEffect(() => {
    if (!open) return
    setForm(initialState(incident))
    setReason('')
    setErrors({})
    setDetailErrors({})
    setProblem(null)
    correct.reset()
  }, [open, incident])

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const categories = categoriesQuery.data ?? []
  const category = categories.find((c) => c.id === form.categoryId) ?? null
  const categoryKey = category?.key ?? incident.category.key
  const subtypeKey = category?.subtypes.find((s) => s.id === form.subtypeId)?.key
  const showHospitalOutcome = form.kinds.length > 0 && !NO_HOSPITAL_OUTCOME_CATEGORIES.has(categoryKey)
  const hasDetails = Boolean(CATEGORY_DETAILS_TITLE[categoryKey])

  // Keep the current people selectable even when they aren't in the first page of search results.
  const withCurrent = (options: ComboboxOption[], current: Person | null) =>
    current && !options.some((o) => o.value === current.id)
      ? [{ value: current.id, label: current.name }, ...options]
      : options
  const serviceUserOptions = withCurrent(
    (serviceUsersQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.serviceUserNumber ?? undefined,
    })),
    incident.primaryServiceUser && form.serviceUserId === incident.primaryServiceUser.id
      ? { id: incident.primaryServiceUser.id, name: incident.primaryServiceUser.name ?? 'Service user' }
      : null,
  )
  const employeeOptions = withCurrent(
    (employeesQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    })),
    incident.primaryEmployee && form.employeeId === incident.primaryEmployee.id
      ? { id: incident.primaryEmployee.id, name: incident.primaryEmployee.name ?? 'Staff member' }
      : null,
  )
  const otherSuOptions: ComboboxOption[] = (otherSuQuery.data?.rows ?? [])
    .filter((r) => r.id !== form.serviceUserId && !form.otherSus.some((p) => p.id === r.id))
    .map((r) => ({ value: r.id, label: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed' }))

  const visitServiceUserId = form.kinds.includes('SERVICE_USER') ? form.serviceUserId : ''
  const visitEmployeeId =
    (form.kinds.includes('EMPLOYEE') && form.employeeId) || incident.reporterEmployeeId || ''
  const canPickVisit = Boolean(form.occurredLocal && (visitServiceUserId || visitEmployeeId))

  /** Only what changed is sent; the API records each changed field with its old value. */
  function buildChanges(): Omit<CorrectIncidentInput, 'reason'> {
    const out: Omit<CorrectIncidentInput, 'reason'> = {}
    const kinds = form.kinds
    const su = kinds.includes('SERVICE_USER') ? form.serviceUserId : ''
    const emp = kinds.includes('EMPLOYEE') ? form.employeeId : ''
    const otherName = kinds.some(isOtherKind) ? form.otherName.trim() : ''
    if (form.occurredLocal !== start.occurredLocal) out.occurredAt = orgDatetimeLocalToIso(form.occurredLocal)
    const categoryChanged = form.categoryId !== start.categoryId
    if (categoryChanged) out.categoryId = form.categoryId
    if (categoryChanged || form.subtypeId !== start.subtypeId) out.subtypeId = form.subtypeId || null
    if (!sameSet(kinds, start.kinds)) out.affectedPersonKinds = kinds
    if (su !== start.serviceUserId) out.primaryServiceUserId = su || null
    if (emp !== start.employeeId) out.primaryEmployeeId = emp || null
    if (otherName !== start.otherName.trim()) out.primaryPersonName = otherName || null
    const otherSuIds = form.otherSus.map((p) => p.id)
    const otherStaffIds = form.otherStaff.map((p) => p.id)
    if (!sameList(otherSuIds, start.otherSus.map((p) => p.id))) out.serviceUserIds = otherSuIds
    if (!sameList(otherStaffIds, start.otherStaff.map((p) => p.id))) out.employeeIds = otherStaffIds
    if (form.locationId !== start.locationId) out.locationId = form.locationId || null
    const job = form.visitChoice && form.visitChoice !== NOT_DURING_VISIT ? form.visitChoice : null
    if (job !== (incident.scheduledJobId ?? null)) out.scheduledJobId = job
    const details = categoryDetailsForSubmit(categoryKey, form.details) ?? null
    if (categoryChanged || JSON.stringify(details) !== JSON.stringify(categoryDetailsForSubmit(incident.category.key, start.details) ?? null))
      out.categoryDetails = details
    if (showHospitalOutcome) {
      if (form.ambulanceAttended !== start.ambulanceAttended) out.ambulanceAttended = form.ambulanceAttended
      if (form.takenToAe !== start.takenToAe) out.takenToAe = form.takenToAe
      if (form.admittedToHospital !== start.admittedToHospital) out.admittedToHospital = form.admittedToHospital
    }
    if (!sameSet(form.actionCodes, start.actionCodes)) out.immediateActionCodes = form.actionCodes
    if (!sameSet(form.whoInformed, start.whoInformed)) out.whoInformedKeys = form.whoInformed
    if (form.severity !== start.severity) out.severity = form.severity as IncidentSeverity
    return out
  }

  function submit() {
    const next: Record<string, string> = {}
    if (!reason.trim()) next.reason = 'Say why the details are being corrected'
    const iso = form.occurredLocal ? orgDatetimeLocalToIso(form.occurredLocal) : ''
    if (!iso) next.occurredAt = 'Enter the date and time'
    else if (Date.parse(iso) > Date.now() + 60_000) next.occurredAt = 'The date/time cannot be in the future'
    if (form.kinds.includes('SERVICE_USER') && !form.serviceUserId) next.serviceUserId = 'Select the service user'
    if (form.kinds.includes('EMPLOYEE') && !form.employeeId) next.employeeId = 'Select the staff member'
    if (form.kinds.some(isOtherKind) && !form.otherName.trim()) next.otherName = 'Enter the name of the person affected'
    if (form.actionCodes.includes('NO_ACTION_NEEDED') && form.actionCodes.length > 1)
      next.actionCodes = '"No action needed" cannot be combined with other actions'
    if (form.whoInformed.includes('no_one_yet') && form.whoInformed.length > 1)
      next.whoInformed = '"No one informed yet" cannot be combined with other people'
    const changes = buildChanges()
    const cdErrors =
      changes.categoryDetails !== undefined
        ? validateCategoryDetails(categoryKey, subtypeKey, form.details, {
            hasLinkedVisit: Boolean(form.visitChoice && form.visitChoice !== NOT_DURING_VISIT),
            today: new Date().toISOString().slice(0, 10),
          })
        : {}
    if (Object.keys(changes).length === 0) next.form = 'Nothing has been changed yet.'
    setErrors(next)
    setDetailErrors(cdErrors)
    const messages = [...Object.values(next), ...Object.values(cdErrors)]
    if (messages.length) {
      setProblem(messages.length === 1 ? (messages[0] ?? null) : `Please fix ${messages.length} things: ${messages.join(' · ')}`)
      // Bring the first highlighted field into view (it may be above or below the fold).
      requestAnimationFrame(() => {
        const el = bodyRef.current?.querySelector('p.text-destructive')
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
      return
    }
    setProblem(null)
    correct.mutate(
      { reason: reason.trim(), ...changes },
      {
        onSuccess: () => onOpenChange(false),
        onError: (e) => setProblem(extractApiErrorMessage(e, 'The correction could not be saved.')),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Correct details</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] overflow-y-auto">
          <div ref={bodyRef} className="space-y-5">
          <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Change only what was recorded wrongly. The old values stay in the history with your reason.
            The carer’s own account (what happened, before, afterwards) can’t be changed here — add a
            clarification note to it instead.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="When did it happen?" htmlFor="corr-when" required error={errors.occurredAt}>
              <Input
                id="corr-when"
                type="datetime-local"
                value={form.occurredLocal}
                onChange={(e) => {
                  set('occurredLocal', e.target.value)
                }}
              />
            </FormField>
            <FormField label="Branch" htmlFor="corr-branch">
              <select
                id="corr-branch"
                className={selectClass}
                value={form.locationId}
                onChange={(e) => set('locationId', e.target.value)}
              >
                <option value="">No branch</option>
                {(locationsQuery.data?.zones ?? [])
                  .filter((z) => z.branches.length > 0)
                  .map((z) => (
                    <optgroup key={z.id} label={z.name}>
                      {z.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
              </select>
            </FormField>

            <FormField label="What are you reporting?" htmlFor="corr-category" required>
              <select
                id="corr-category"
                className={selectClass}
                value={form.categoryId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, categoryId: e.target.value, subtypeId: '', details: {} }))
                }
              >
                {!categories.some((c) => c.id === form.categoryId) && (
                  <option value={form.categoryId}>{incident.category.label}</option>
                )}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
            {category && category.subtypes.length > 0 && (
              <FormField
                label={subtypeQuestion(category)}
                htmlFor="corr-subtype"
                hint={subtypeKey ? SUBTYPE_HINTS[categoryKey]?.[subtypeKey] : undefined}
              >
                <select
                  id="corr-subtype"
                  className={selectClass}
                  value={form.subtypeId}
                  onChange={(e) => setForm((prev) => ({ ...prev, subtypeId: e.target.value }))}
                >
                  <option value="">Not specified</option>
                  {category.subtypes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Who was affected?" className="sm:col-span-2">
              <MultiSelectDropdown
                options={INCIDENT_PERSON_KIND_OPTIONS}
                selected={form.kinds}
                onChange={(next) => set('kinds', next as IncidentPersonKind[])}
                placeholder="Select who was affected…"
              />
            </FormField>
            {form.kinds.includes('SERVICE_USER') && (
              <FormField label="Service user" required error={errors.serviceUserId}>
                <Combobox
                  options={serviceUserOptions}
                  value={form.serviceUserId}
                  onChange={(id) => set('serviceUserId', id)}
                  onSearchChange={setSuSearch}
                  loading={serviceUsersQuery.isLoading}
                  placeholder="Search service user…"
                  searchPlaceholder="Search service users…"
                />
              </FormField>
            )}
            {form.kinds.includes('EMPLOYEE') && (
              <FormField label="Staff member" required error={errors.employeeId}>
                <Combobox
                  options={employeeOptions}
                  value={form.employeeId}
                  onChange={(id) => set('employeeId', id)}
                  onSearchChange={setEmpSearch}
                  loading={employeesQuery.isLoading}
                  placeholder="Search staff…"
                  searchPlaceholder="Search staff…"
                />
              </FormField>
            )}
            {form.kinds.some(isOtherKind) && (
              <FormField label="Name of person affected" htmlFor="corr-other" required error={errors.otherName}>
                <Input id="corr-other" value={form.otherName} onChange={(e) => set('otherName', e.target.value)} />
              </FormField>
            )}

            <FormField label="Other service users involved">
              <Combobox
                options={otherSuOptions}
                value=""
                onChange={(id) => {
                  const name = otherSuOptions.find((o) => o.value === id)?.label
                  if (id && name) set('otherSus', [...form.otherSus, { id, name }])
                }}
                onSearchChange={setOtherSuSearch}
                loading={otherSuQuery.isLoading}
                placeholder="Add service user…"
                searchPlaceholder="Search service users…"
              />
              <PickedChips
                items={form.otherSus.map((p) => ({ id: p.id, label: p.name }))}
                onRemove={(id) => set('otherSus', form.otherSus.filter((p) => p.id !== id))}
              />
            </FormField>
            <FormField label="Other staff involved">
              <IncidentStaffMultiSelect
                selected={form.otherStaff}
                onChange={(next) => set('otherStaff', next)}
                placeholder="Select staff…"
              />
              <PickedChips
                items={form.otherStaff.map((p) => ({ id: p.id, label: p.name }))}
                onRemove={(id) => set('otherStaff', form.otherStaff.filter((p) => p.id !== id))}
              />
            </FormField>

            <FormField label="Visit (where it happened or was discovered)" className="sm:col-span-2">
              {canPickVisit ? (
                <IncidentVisitPicker
                  serviceUserId={visitServiceUserId || undefined}
                  employeeId={visitServiceUserId ? undefined : visitEmployeeId || undefined}
                  incidentAt={form.occurredLocal}
                  reporterEmployeeId={incident.reporterEmployeeId ?? undefined}
                  value={form.visitChoice}
                  onChange={(v) => set('visitChoice', v)}
                  onSelectedVisitChange={setSelectedVisit}
                  noVisitLabel={categoryKey === 'CARE_DELIVERY' ? 'No matching visit found' : undefined}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Select the person affected to choose a visit.</p>
              )}
            </FormField>
          </div>

          {hasDetails && (
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">{CATEGORY_DETAILS_TITLE[categoryKey]}</h4>
              {form.categoryId !== start.categoryId && (
                <p className="text-xs text-muted-foreground">
                  The category has changed, so its details need answering again.
                </p>
              )}
              <IncidentCategoryDetailsFields
                categoryKey={categoryKey}
                subtypeKey={subtypeKey}
                value={form.details}
                onChange={(next) => set('details', next)}
                errors={detailErrors}
                serviceUserId={visitServiceUserId || undefined}
                selectedVisit={
                  selectedVisit && form.visitChoice === selectedVisit.scheduledJobId ? selectedVisit : null
                }
                visitLinked={form.visitChoice !== NOT_DURING_VISIT}
              />
            </section>
          )}

          {showHospitalOutcome && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField label="Ambulance attended?">
                <YesNoField
                  name="corr-ambulance"
                  allowUnknown
                  value={form.ambulanceAttended}
                  onChange={(v) => set('ambulanceAttended', v)}
                />
              </FormField>
              <FormField label="Taken to A&E?">
                <YesNoField name="corr-ae" allowUnknown value={form.takenToAe} onChange={(v) => set('takenToAe', v)} />
              </FormField>
              <FormField label="Admitted to hospital?">
                <YesNoField
                  name="corr-admitted"
                  allowUnknown
                  value={form.admittedToHospital}
                  onChange={(v) => set('admittedToHospital', v)}
                />
              </FormField>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="What was done?" error={errors.actionCodes}>
              <MultiSelectDropdown
                options={IMMEDIATE_ACTION_OPTIONS}
                selected={form.actionCodes}
                onChange={(next) => set('actionCodes', next)}
                placeholder="Select…"
              />
            </FormField>
            <FormField label="Who was informed?" error={errors.whoInformed}>
              <MultiSelectDropdown
                options={OFFICE_WHO_INFORMED_OPTIONS}
                selected={form.whoInformed}
                onChange={(next) => set('whoInformed', next)}
                placeholder="Select…"
              />
            </FormField>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">How serious is it?</legend>
            <div className="space-y-1.5">
              {INCIDENT_SEVERITY_FORM_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm',
                    form.severity === o.value ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name="corr-severity"
                    className="mt-0.5"
                    checked={form.severity === o.value}
                    onChange={() => set('severity', o.value)}
                  />
                  <span>
                    <span className="font-medium text-foreground">{o.label}</span>{' '}
                    <span className="text-muted-foreground">({o.hint})</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <FormField label="Reason for the correction" htmlFor="corr-reason" required error={errors.reason}>
            <Textarea
              id="corr-reason"
              rows={2}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Carer confirmed by phone that it was a fall, at 08:30"
            />
          </FormField>
          </div>
        </DialogBody>
        <DialogFooter className="flex-wrap items-center">
          {problem && (
            <p role="alert" className="mr-auto max-w-md text-sm text-destructive dark:text-red-400">
              {problem}
            </p>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={correct.isPending} onClick={submit}>
            Save correction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
