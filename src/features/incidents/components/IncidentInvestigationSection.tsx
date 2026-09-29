import * as React from 'react'
import { BookOpen, UserCheck, UserX, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { useLearningCourses } from '@/features/learning/hooks/useLearning'
import {
  useRecommendIncidentCarerCourse,
  useRemoveIncidentCarerCourseRecommendation,
  useRemoveIncidentCarerSuspension,
  useSuspendIncidentCarer,
  useUpsertIncidentInvestigation,
} from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS,
  INCIDENT_EXTERNAL_INVESTIGATION_TYPE_OPTIONS,
  INCIDENT_INVESTIGATION_SCOPE_OPTIONS,
  INCIDENT_PREVENTABILITY_OPTIONS,
  type IncidentCarerCourseRecommendation,
  type IncidentCarerSuspension,
  type IncidentExternalInvestigationType,
  type IncidentInvestigation,
  type IncidentInvestigationScope,
  type IncidentPreventability,
  type UpsertIncidentInvestigationInput,
} from '@/features/incidents/types'

const selectClass =
  'mt-1 h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const factorLabel = (code: string) =>
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.find((f) => f.value === code)?.label ?? code

const scopeLabel = (v: string) =>
  INCIDENT_INVESTIGATION_SCOPE_OPTIONS.find((o) => o.value === v)?.label ?? v

const externalTypeLabel = (v: string) =>
  INCIDENT_EXTERNAL_INVESTIGATION_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v

function formatSuspendRange(from: string | null | undefined, to: string | null | undefined) {
  if (!from && !to) return null
  const fromLabel = from ? formatOrganisationIsoDateLong(from) : '—'
  const toLabel = to ? formatOrganisationIsoDateLong(to) : '—'
  return `${fromLabel} → ${toLabel}`
}

export function IncidentInvestigationSection({
  incidentId,
  investigation,
  carerSuspensions,
  courseRecommendations,
  canEdit,
  primaryEmployeeId,
}: {
  incidentId: string
  investigation: IncidentInvestigation | null
  carerSuspensions: IncidentCarerSuspension[]
  courseRecommendations: IncidentCarerCourseRecommendation[]
  canEdit: boolean
  primaryEmployeeId?: string | null
}) {
  const mutation = useUpsertIncidentInvestigation(incidentId)
  const suspendMutation = useSuspendIncidentCarer(incidentId)
  const removeSuspensionMutation = useRemoveIncidentCarerSuspension(incidentId)
  const recommendCourseMutation = useRecommendIncidentCarerCourse(incidentId)
  const removeCourseMutation = useRemoveIncidentCarerCourseRecommendation(incidentId)
  const [scope, setScope] = React.useState<string>(investigation?.investigationScope ?? '')
  const [externalType, setExternalType] = React.useState<string>(investigation?.externalType ?? '')
  const [whatHappened, setWhatHappened] = React.useState(investigation?.whatHappened ?? '')
  const [whyHappened, setWhyHappened] = React.useState(investigation?.whyHappened ?? '')
  const [rootCause, setRootCause] = React.useState(investigation?.rootCause ?? '')
  const [conclusion, setConclusion] = React.useState(investigation?.conclusion ?? '')
  const [preventable, setPreventable] = React.useState<string>(investigation?.preventable ?? '')
  const [factors, setFactors] = React.useState<string[]>(investigation?.contributingFactors ?? [])

  const suspendedIds = React.useMemo(
    () => new Set(carerSuspensions.map((s) => s.employeeId)),
    [carerSuspensions],
  )

  const recommendedPairs = React.useMemo(
    () => new Set(courseRecommendations.map((r) => `${r.employeeId}:${r.courseId}`)),
    [courseRecommendations],
  )

  const [suspendEmployeeId, setSuspendEmployeeId] = React.useState(
    primaryEmployeeId && !suspendedIds.has(primaryEmployeeId) ? primaryEmployeeId : '',
  )
  const [suspendReason, setSuspendReason] = React.useState('')
  const [suspendFrom, setSuspendFrom] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [suspendTo, setSuspendTo] = React.useState('')
  const [empSearch, setEmpSearch] = React.useState('')

  const [courseEmployeeId, setCourseEmployeeId] = React.useState(primaryEmployeeId ?? '')
  const [courseId, setCourseId] = React.useState('')
  const [courseDueAt, setCourseDueAt] = React.useState('')
  const [courseReason, setCourseReason] = React.useState('')
  const [courseEmpSearch, setCourseEmpSearch] = React.useState('')
  const [courseSearch, setCourseSearch] = React.useState('')

  const employeesQuery = useEmployees({ limit: 50, search: empSearch || undefined })
  const courseEmployeesQuery = useEmployees({ limit: 50, search: courseEmpSearch || undefined })
  const coursesQuery = useLearningCourses({
    limit: 50,
    status: 'PUBLISHED',
    search: courseSearch || undefined,
  })
  const nameMap = useEmployeeNameMap(
    [
      primaryEmployeeId,
      suspendEmployeeId,
      courseEmployeeId,
      ...carerSuspensions.map((s) => s.employeeId),
      ...courseRecommendations.map((r) => r.employeeId),
    ].filter((id): id is string => Boolean(id)),
  )

  const employeeOptions: ComboboxOption[] = React.useMemo(() => {
    const rows = (employeesQuery.data?.rows ?? [])
      .filter((r) => !suspendedIds.has(r.id))
      .map((r) => ({
        value: r.id,
        label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
        description: r.jobTitle?.name ?? undefined,
      }))
    if (suspendEmployeeId && !rows.some((r) => r.value === suspendEmployeeId) && !suspendedIds.has(suspendEmployeeId)) {
      const name = nameMap.get(suspendEmployeeId)
      if (name) rows.unshift({ value: suspendEmployeeId, label: name, description: undefined })
    }
    return rows
  }, [employeesQuery.data, suspendEmployeeId, nameMap, suspendedIds])

  const courseEmployeeOptions: ComboboxOption[] = React.useMemo(() => {
    const rows = (courseEmployeesQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    // Ensure suspended carers remain selectable for course recommendation.
    for (const s of carerSuspensions) {
      if (!rows.some((r) => r.value === s.employeeId)) {
        const name = nameMap.get(s.employeeId)
        if (name) rows.unshift({ value: s.employeeId, label: name, description: 'Suspended' })
      }
    }
    if (courseEmployeeId && !rows.some((r) => r.value === courseEmployeeId)) {
      const name = nameMap.get(courseEmployeeId)
      if (name) rows.unshift({ value: courseEmployeeId, label: name, description: undefined })
    }
    return rows
  }, [courseEmployeesQuery.data, courseEmployeeId, nameMap, carerSuspensions])

  const courseOptions: ComboboxOption[] = React.useMemo(() => {
    const rows = (coursesQuery.data?.rows ?? [])
      .filter((c) => c.status === 'PUBLISHED' || !c.status)
      .filter((c) => !courseEmployeeId || !recommendedPairs.has(`${courseEmployeeId}:${c.id}`))
      .map((c) => ({
        value: c.id,
        label: c.title,
        description: c.code ?? undefined,
      }))
    return rows
  }, [coursesQuery.data, courseEmployeeId, recommendedPairs])

  function toggleFactor(code: string) {
    setFactors((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]))
  }

  function onScopeChange(next: string) {
    setScope(next)
    if (next !== 'EXTERNAL') setExternalType('')
  }

  function save(markComplete: boolean) {
    if (scope === 'EXTERNAL' && !externalType) return
    const input: UpsertIncidentInvestigationInput = {
      investigationScope: (scope || undefined) as IncidentInvestigationScope | undefined,
      externalType:
        scope === 'EXTERNAL'
          ? (externalType as IncidentExternalInvestigationType)
          : scope === 'INTERNAL'
            ? null
            : undefined,
      whatHappened: whatHappened.trim() || undefined,
      whyHappened: whyHappened.trim() || undefined,
      rootCause: rootCause.trim() || undefined,
      conclusion: conclusion.trim() || undefined,
      preventable: (preventable || undefined) as IncidentPreventability | undefined,
      contributingFactors: factors,
      markComplete,
    }
    mutation.mutate(input)
  }

  function suspendCarer() {
    if (!suspendEmployeeId || !suspendReason.trim() || !suspendFrom || !suspendTo) return
    if (suspendTo < suspendFrom) {
      window.alert('End date must be on or after the start date.')
      return
    }
    const ok = window.confirm(
      'Suspend this carer? They will be set inactive and removed from future rota allocations.',
    )
    if (!ok) return
    suspendMutation.mutate(
      {
        employeeId: suspendEmployeeId,
        reason: suspendReason.trim(),
        suspendFrom,
        suspendTo,
      },
      {
        onSuccess: () => {
          setSuspendReason('')
          setSuspendTo('')
          setSuspendEmployeeId('')
          setEmpSearch('')
        },
      },
    )
  }

  function recommendCourse() {
    if (!courseEmployeeId || !courseId) return
    recommendCourseMutation.mutate(
      {
        employeeId: courseEmployeeId,
        courseId,
        dueAt: courseDueAt || undefined,
        reason: courseReason.trim() || undefined,
        isMandatory: true,
      },
      {
        onSuccess: () => {
          setCourseId('')
          setCourseDueAt('')
          setCourseReason('')
          setCourseSearch('')
        },
      },
    )
  }

  const suspensionsList =
    carerSuspensions.length === 0 ? null : (
      <ul className="space-y-2">
        {carerSuspensions.map((s) => (
          <li
            key={s.id}
            className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                  <UserX className="h-4 w-4" /> {nameMap.get(s.employeeId) ?? 'Carer'} suspended
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatSuspendRange(s.suspendFrom, s.suspendTo)}
                </p>
                {s.reason && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{s.reason}</p>
                )}
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={removeSuspensionMutation.isPending}
                  onClick={() => {
                    const ok = window.confirm(
                      'Remove this carer suspension? They will be set active again if they have no other incident suspensions.',
                    )
                    if (!ok) return
                    removeSuspensionMutation.mutate(s.id)
                  }}
                >
                  <UserCheck className="mr-1 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    )

  const coursesList =
    courseRecommendations.length === 0 ? null : (
      <ul className="space-y-2">
        {courseRecommendations.map((r) => (
          <li
            key={r.id}
            className="rounded-md border border-border bg-background px-3 py-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <BookOpen className="h-4 w-4 text-primary" />
                  {r.courseTitle ?? 'Course'}
                  {r.courseCode ? (
                    <span className="text-xs font-normal text-muted-foreground">({r.courseCode})</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  For {nameMap.get(r.employeeId) ?? 'carer'}
                  {r.dueAt ? ` · Due ${formatOrganisationIsoDateLong(r.dueAt)}` : ''}
                </p>
                {r.reason && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{r.reason}</p>
                )}
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  loading={removeCourseMutation.isPending}
                  onClick={() => {
                    const ok = window.confirm(
                      'Remove this course recommendation? The learning assignment will be cancelled.',
                    )
                    if (!ok) return
                    removeCourseMutation.mutate(r.id)
                  }}
                >
                  <X className="mr-1 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    )

  if (!canEdit) {
    if (!investigation && carerSuspensions.length === 0 && courseRecommendations.length === 0) {
      return <p className="text-sm text-muted-foreground">No investigation recorded yet.</p>
    }
    return (
      <div className="space-y-3 text-sm">
        {investigation?.investigationScope && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="info" size="sm">{scopeLabel(investigation.investigationScope)}</Badge>
            {investigation.investigationScope === 'EXTERNAL' && investigation.externalType && (
              <Badge variant="muted" size="sm">{externalTypeLabel(investigation.externalType)}</Badge>
            )}
          </div>
        )}
        {investigation?.whatHappened && <ReadField label="What happened" value={investigation.whatHappened} />}
        {investigation?.whyHappened && <ReadField label="Why it happened" value={investigation.whyHappened} />}
        {investigation && investigation.contributingFactors.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Contributing factors</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {investigation.contributingFactors.map((f) => (
                <Badge key={f} variant="muted" size="sm">{factorLabel(f)}</Badge>
              ))}
            </div>
          </div>
        )}
        {investigation?.rootCause && <ReadField label="Root cause" value={investigation.rootCause} />}
        {investigation?.preventable && <ReadField label="Preventable" value={investigation.preventable} />}
        {investigation?.conclusion && <ReadField label="Conclusion" value={investigation.conclusion} />}
        {suspensionsList}
        {coursesList}
        {investigation?.completedAt && <Badge variant="success" size="sm">Investigation complete</Badge>}
      </div>
    )
  }

  const externalTypeRequired = scope === 'EXTERNAL' && !externalType

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Investigation type
        </label>
        <select
          className={selectClass}
          value={scope}
          onChange={(e) => onScopeChange(e.target.value)}
          aria-label="Investigation type"
        >
          <option value="">Not set</option>
          {INCIDENT_INVESTIGATION_SCOPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {scope === 'EXTERNAL' && (
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            External investigation
          </label>
          <select
            className={selectClass}
            value={externalType}
            onChange={(e) => setExternalType(e.target.value)}
            aria-label="External investigation type"
          >
            <option value="">Select…</option>
            {INCIDENT_EXTERNAL_INVESTIGATION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {externalTypeRequired && (
            <p className="mt-1 text-xs text-muted-foreground">
              Choose Police, Agency, or Combined.
            </p>
          )}
        </div>
      )}

      <TextField label="What happened?" value={whatHappened} onChange={setWhatHappened} />
      <TextField label="Why did it happen?" value={whyHappened} onChange={setWhyHappened} />
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Contributing factors</p>
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          {INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.map((f) => (
            <label key={f.value} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/40">
              <input type="checkbox" checked={factors.includes(f.value)} onChange={() => toggleFactor(f.value)} className="h-3.5 w-3.5 rounded border-border" />
              {f.label}
            </label>
          ))}
        </div>
      </div>
      <TextField label="Root cause" value={rootCause} onChange={setRootCause} />
      <div>
        <label className="text-xs uppercase tracking-wide text-muted-foreground">Could this have been prevented?</label>
        <select
          className={selectClass}
          value={preventable}
          onChange={(e) => setPreventable(e.target.value)}
        >
          <option value="">Not set</option>
          {INCIDENT_PREVENTABILITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
      <TextField label="Conclusion" value={conclusion} onChange={setConclusion} />
      <div className="flex gap-2">
        <Button
          className="flex-1"
          size="sm"
          variant="outline"
          loading={mutation.isPending}
          disabled={externalTypeRequired}
          onClick={() => save(false)}
        >
          Save
        </Button>
        <Button
          className="flex-1"
          size="sm"
          loading={mutation.isPending}
          disabled={externalTypeRequired}
          onClick={() => save(true)}
        >
          Save &amp; complete
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          After investigation — carer suspension
        </h4>
        <p className="mb-3 text-xs text-muted-foreground">
          Suspend one or more carers. Each suspension sets that carer inactive and removes future rota allocations.
        </p>

        {suspensionsList ? <div className="mb-3">{suspensionsList}</div> : null}

        <div className="space-y-2">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Carer</p>
            <Combobox
              value={suspendEmployeeId}
              onChange={setSuspendEmployeeId}
              options={employeeOptions}
              onSearchChange={setEmpSearch}
              loading={employeesQuery.isLoading}
              placeholder="Select carer to suspend"
              searchPlaceholder="Search staff…"
              emptyText="No staff match your search."
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="suspend-from">
                Suspended from
              </label>
              <input
                id="suspend-from"
                type="date"
                className={selectClass}
                value={suspendFrom}
                onChange={(e) => setSuspendFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="suspend-to">
                Suspended to
              </label>
              <input
                id="suspend-to"
                type="date"
                className={selectClass}
                value={suspendTo}
                min={suspendFrom || undefined}
                onChange={(e) => setSuspendTo(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Suspension reason
            </label>
            <Textarea
              className="mt-1"
              rows={2}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Why is this carer being suspended?"
            />
          </div>
          <Button
            size="sm"
            variant="destructive"
            loading={suspendMutation.isPending}
            disabled={
              !suspendEmployeeId ||
              suspendReason.trim().length < 3 ||
              !suspendFrom ||
              !suspendTo ||
              suspendTo < suspendFrom
            }
            onClick={suspendCarer}
          >
            <UserX className="mr-1 h-4 w-4" /> Suspend carer
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3 sm:p-4">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          After investigation — recommend a course
        </h4>
        <p className="mb-3 text-xs text-muted-foreground">
          Assign a published learning course to a carer as a corrective action after investigation. Works for suspended carers too.
        </p>

        {coursesList ? <div className="mb-3">{coursesList}</div> : null}

        <div className="space-y-2">
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Carer</p>
            <Combobox
              value={courseEmployeeId}
              onChange={setCourseEmployeeId}
              options={courseEmployeeOptions}
              onSearchChange={setCourseEmpSearch}
              loading={courseEmployeesQuery.isLoading}
              placeholder="Select carer"
              searchPlaceholder="Search staff…"
              emptyText="No staff match your search."
            />
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Course</p>
            <Combobox
              value={courseId}
              onChange={setCourseId}
              options={courseOptions}
              onSearchChange={setCourseSearch}
              loading={coursesQuery.isLoading}
              placeholder="Select published course"
              searchPlaceholder="Search courses…"
              emptyText="No published courses match."
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="course-due">
              Due date (optional)
            </label>
            <input
              id="course-due"
              type="date"
              className={selectClass}
              value={courseDueAt}
              onChange={(e) => setCourseDueAt(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Reason (optional)
            </label>
            <Textarea
              className="mt-1"
              rows={2}
              value={courseReason}
              onChange={(e) => setCourseReason(e.target.value)}
              placeholder="Why is this course recommended?"
            />
          </div>
          <Button
            size="sm"
            loading={recommendCourseMutation.isPending}
            disabled={!courseEmployeeId || !courseId}
            onClick={recommendCourse}
          >
            <BookOpen className="mr-1 h-4 w-4" /> Recommend course
          </Button>
        </div>
      </div>
    </div>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      <Textarea className="mt-1" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  )
}
