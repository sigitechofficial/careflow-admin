import * as React from 'react'
import { CheckCircle2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import { useLearningCourses } from '@/features/learning/hooks/useLearning'
import { useContributingFactorOptions } from '@/features/incidents/hooks/useContributingFactorOptions'
import { RecordItemsPicker } from '@/features/incidents/components/ContributingFactorDetail'
import {
  CarePlanOpenLinks,
  CarePlanVersionPicker,
} from '@/features/incidents/components/CarePlanMeasureEvidence'
import { usePolicies } from '@/features/policies/hooks/usePolicies'
import {
  useCompleteIncidentAction,
  useCreateIncidentAction,
  useRemoveIncidentAction,
  useUpdateIncidentAction,
} from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_ACTION_STATUS_BADGE,
  INCIDENT_ACTION_STATUS_LABELS,
  INCIDENT_CONTRIBUTING_FACTOR_OPTIONS,
  INCIDENT_MEASURE_TYPE_OPTIONS,
  incidentMeasureTypeLabel,
  measureNeedsCompletedRecord,
  type CreateIncidentActionInput,
  type IncidentAction,
  type IncidentActionPriority,
  type IncidentActionStatus,
  type IncidentMeasureType,
  type UpdateIncidentActionInput,
} from '@/features/incidents/types'

type Item = { id: string; label: string }

const PRIORITY_BADGE: Record<IncidentActionPriority, 'muted' | 'warning' | 'destructive'> = {
  LOW: 'muted',
  MEDIUM: 'warning',
  HIGH: 'destructive',
}

const PRIORITY_LABEL: Record<IncidentActionPriority, string> = {
  LOW: 'Low priority',
  MEDIUM: 'Medium priority',
  HIGH: 'High priority',
}

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const factorLabel = (code: string) =>
  code === 'ROOT_CAUSE'
    ? 'Root cause'
    : (INCIDENT_CONTRIBUTING_FACTOR_OPTIONS.find((f) => f.value === code)?.label ?? code)

type FormState = {
  measureType: IncidentMeasureType | ''
  title: string
  /** False while the title follows the type and linked records. */
  titleEdited: boolean
  description: string
  priority: IncidentActionPriority
  dueDate: string
  assignedEmployeeId: string
  isMandatory: boolean
  status: IncidentActionStatus
  linkedRecords: Item[]
  /** "New … needed" instead of updating an existing record. */
  newRecordNeeded: boolean
  addresses: string[]
  courseEmployee: Item | null
  course: Item | null
}

const EMPTY_FORM: FormState = {
  measureType: '',
  title: '',
  titleEdited: false,
  description: '',
  priority: 'MEDIUM',
  dueDate: '',
  assignedEmployeeId: '',
  isMandatory: false,
  status: 'NOT_STARTED',
  linkedRecords: [],
  newRecordNeeded: false,
  addresses: [],
  courseEmployee: null,
  course: null,
}

function actionToForm(a: IncidentAction): FormState {
  return {
    ...EMPTY_FORM,
    measureType: a.measureType ?? '',
    title: a.title,
    titleEdited: true,
    description: a.description ?? '',
    priority: a.priority,
    dueDate: a.dueDate ? a.dueDate.slice(0, 10) : '',
    assignedEmployeeId: a.assignedEmployeeId ?? '',
    isMandatory: a.isMandatory,
    status: a.status,
    linkedRecords: a.linkedRecords ?? [],
    newRecordNeeded: a.newRecordNeeded ?? false,
    addresses: a.addresses ?? [],
  }
}

/** Title suggested from the type and what it links to (until the user edits it). */
function suggestedTitle(f: FormState, needNew: boolean): string {
  const type = incidentMeasureTypeLabel(f.measureType)
  if (!type) return ''
  const newLabel = INCIDENT_MEASURE_TYPE_OPTIONS.find((o) => o.value === f.measureType)?.newLabel
  if (needNew && newLabel) return newLabel
  if (f.measureType === 'COURSE') {
    if (!f.course) return type
    return `Course: ${f.course.label}${f.courseEmployee ? ` for ${f.courseEmployee.label}` : ''}`
  }
  return f.linkedRecords.length ? `${type}: ${f.linkedRecords.map((i) => i.label).join(', ')}` : type
}

export function IncidentActionsSection({
  incidentId,
  actions,
  canManage,
  findings,
  serviceUsers = [],
  involvedEmployees = [],
  incidentReference = '',
}: {
  incidentId: string
  /** e.g. INC-2026-000012 — carried to the care plan page so the new version links back. */
  incidentReference?: string
  actions: IncidentAction[]
  canManage: boolean
  /** Investigation findings a measure can address. */
  findings?: { rootCause: string | null; contributingFactors: string[] } | null
  serviceUsers?: { id: string; name: string | null }[]
  involvedEmployees?: { id: string; name: string | null }[]
}) {
  const createMutation = useCreateIncidentAction(incidentId)
  const updateMutation = useUpdateIncidentAction()
  const completeMutation = useCompleteIncidentAction()
  const removeMutation = useRemoveIncidentAction()
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [removeReason, setRemoveReason] = React.useState('')

  const [mode, setMode] = React.useState<'closed' | 'create' | 'edit'>('closed')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)
  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }))

  const [completingId, setCompletingId] = React.useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = React.useState('')
  // Care plan / risk assessment / policy measures: the record actually updated or added.
  const [completedRecords, setCompletedRecords] = React.useState<Item[]>([])
  // Care plan update measures: the published version that made the change.
  const [carePlanVersionId, setCarePlanVersionId] = React.useState('')
  const completingAction = actions.find((a) => a.id === completingId)
  const completingType = INCIDENT_MEASURE_TYPE_OPTIONS.find(
    (o) => o.value === completingAction?.measureType,
  )
  // Cancelling from the card's status menu asks for a reason first (required when mandatory).
  const [cancellingId, setCancellingId] = React.useState<string | null>(null)
  const [cancelReason, setCancelReason] = React.useState('')
  // Dropping a mandatory measure (cancel or untick) must be justified — the backend enforces it too.
  const [changeReason, setChangeReason] = React.useState('')
  const editingOriginal = mode === 'edit' ? actions.find((a) => a.id === editingId) : undefined
  const droppingMandatory = Boolean(
    editingOriginal?.isMandatory &&
      ((form.status === 'CANCELLED' && editingOriginal.status !== 'CANCELLED') || !form.isMandatory),
  )

  const typeOption = INCIDENT_MEASURE_TYPE_OPTIONS.find((o) => o.value === form.measureType)
  const formOpen = mode !== 'closed'
  const recordSource = useContributingFactorOptions(serviceUsers, {
    carePlans:
      (formOpen && typeOption?.pick === 'carePlan') || completingType?.pick === 'carePlan',
    assessments:
      (formOpen && typeOption?.pick === 'riskAssessment') ||
      completingType?.pick === 'riskAssessment',
    medications: false,
  })
  // Is there any policy to update? (An empty library means a new one is needed.)
  const policiesQuery = usePolicies({ limit: 1 })
  const recordOptions = {
    carePlan: { options: recordSource.carePlanOptions, loading: recordSource.loading.carePlans },
    riskAssessment: {
      options: recordSource.assessmentOptions,
      loading: recordSource.loading.assessments,
    },
    medication: { options: recordSource.medicationOptions, loading: recordSource.loading.medications },
  }

  const [empSearch, setEmpSearch] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: empSearch || undefined })
  const [carerSearch, setCarerSearch] = React.useState('')
  const carersQuery = useEmployees({ limit: 50, search: carerSearch || undefined })
  const [courseSearch, setCourseSearch] = React.useState('')
  const coursesQuery = useLearningCourses({
    limit: 50,
    status: 'PUBLISHED',
    search: courseSearch || undefined,
  })
  const assigneeIds = React.useMemo(
    () => actions.map((a) => a.assignedEmployeeId).filter((id): id is string => Boolean(id)),
    [actions],
  )
  const nameMap = useEmployeeNameMap(assigneeIds)

  const toOption = (r: {
    id: string
    fullName?: string | null
    firstName?: string | null
    lastName?: string | null
    jobTitle?: { name: string } | null
  }): ComboboxOption => ({
    value: r.id,
    label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
    description: r.jobTitle?.name ?? undefined,
  })

  const employeeOptions: ComboboxOption[] = React.useMemo(() => {
    const rows = (employeesQuery.data?.rows ?? []).map(toOption)
    // Keep the current assignee visible even if not in the latest search results.
    if (form.assignedEmployeeId && !rows.some((r) => r.value === form.assignedEmployeeId)) {
      const name = nameMap.get(form.assignedEmployeeId)
      if (name) rows.unshift({ value: form.assignedEmployeeId, label: name, description: undefined })
    }
    return rows
  }, [employeesQuery.data, form.assignedEmployeeId, nameMap])

  const carerOptions: ComboboxOption[] = React.useMemo(() => {
    const involved = involvedEmployees.map((e) => ({
      value: e.id,
      label: e.name ?? 'Staff member',
      description: 'Involved in this incident',
    }))
    const others = (carersQuery.data?.rows ?? [])
      .filter((r) => !involvedEmployees.some((e) => e.id === r.id))
      .map(toOption)
    return [...involved, ...others]
  }, [carersQuery.data, involvedEmployees])

  const courseOptions: ComboboxOption[] = React.useMemo(
    () =>
      (coursesQuery.data?.rows ?? [])
        .filter((c) => c.status === 'PUBLISHED' || !c.status)
        .map((c) => ({ value: c.id, label: c.title, description: c.code ?? undefined })),
    [coursesQuery.data],
  )

  const addressOptions = [
    ...(findings?.rootCause ? ['ROOT_CAUSE'] : []),
    ...(findings?.contributingFactors ?? []),
  ]

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setEmpSearch('')
    setMode('create')
  }

  function openEdit(a: IncidentAction) {
    setForm(actionToForm(a))
    setEditingId(a.id)
    setEmpSearch('')
    setMode('edit')
    setCompletingId(null)
  }

  function closeForm() {
    setMode('closed')
    setEditingId(null)
    setForm(EMPTY_FORM)
    setEmpSearch('')
    setCarerSearch('')
    setCourseSearch('')
    setChangeReason('')
  }

  // Record-changing types: when there is nothing to update, a new record is the only choice.
  const existingAvailable =
    (typeOption?.pick === 'policy' &&
      (policiesQuery.isLoading || (policiesQuery.data?.rows ?? []).length > 0)) ||
    ((typeOption?.pick === 'carePlan' || typeOption?.pick === 'riskAssessment') &&
      serviceUsers.length > 0 &&
      (recordOptions[typeOption.pick].loading || recordOptions[typeOption.pick].options.length > 0))
  const needNew = !!typeOption?.newLabel && (form.newRecordNeeded || !existingAvailable)
  const title = (form.titleEdited ? form.title : suggestedTitle(form, needNew)).trim()

  // Mirrors the API: who, by when, and what it changes (measures without a type are not checked).
  const typed = mode === 'create' || !!editingOriginal?.measureType
  const missing = [
    !form.measureType && mode === 'create' && 'type',
    form.measureType === 'COURSE' && mode === 'create' && !form.courseEmployee && 'carer',
    form.measureType === 'COURSE' && mode === 'create' && !form.course && 'course',
    typeOption?.newLabel && !needNew && !form.linkedRecords.length && 'the record (or choose new)',
    typeOption?.pick === 'staff' && !form.linkedRecords.length && 'staff member',
    !title && 'title',
    typeOption?.needsDescription && !form.description.trim() && 'description',
    typed && !form.dueDate && 'due date',
    typed && !form.assignedEmployeeId && 'responsible person',
    droppingMandatory && !changeReason.trim() && 'reason',
  ].filter((m): m is string => Boolean(m))
  const canSubmit = missing.length === 0

  function submitForm() {
    if (!canSubmit) return
    if (mode === 'edit' && editingId) {
      const input: UpdateIncidentActionInput = {
        title,
        description: form.description.trim() || null,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        assignedEmployeeId: form.assignedEmployeeId || null,
        isMandatory: form.isMandatory,
        status: form.status,
        addresses: form.addresses,
        ...(editingOriginal?.measureType !== 'COURSE'
          ? {
              linkedRecords: needNew ? [] : form.linkedRecords,
              ...(typeOption?.newLabel ? { newRecordNeeded: needNew } : {}),
            }
          : {}),
        ...(droppingMandatory ? { reason: changeReason.trim() } : {}),
      }
      updateMutation.mutate({ actionId: editingId, input }, { onSuccess: () => closeForm() })
      return
    }
    const input: CreateIncidentActionInput = {
      measureType: form.measureType as IncidentMeasureType,
      title,
      description: form.description.trim() || undefined,
      priority: form.priority,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      assignedEmployeeId: form.assignedEmployeeId || undefined,
      isMandatory: form.isMandatory,
      addresses: form.addresses,
      ...(form.measureType === 'COURSE'
        ? { courseEmployeeId: form.courseEmployee?.id, courseId: form.course?.id }
        : {
            linkedRecords: needNew ? [] : form.linkedRecords,
            ...(typeOption?.newLabel ? { newRecordNeeded: needNew } : {}),
          }),
    }
    createMutation.mutate(input, { onSuccess: () => closeForm() })
  }

  function startRemove(a: IncidentAction) {
    setRemovingId(a.id)
    setRemoveReason('')
    setCompletingId(null)
    setCancellingId(null)
  }

  function confirmRemove(a: IncidentAction) {
    const reason = removeReason.trim()
    if (!reason) return
    removeMutation.mutate(
      { actionId: a.id, reason },
      {
        onSuccess: () => {
          setRemovingId(null)
          setRemoveReason('')
        },
      },
    )
  }

  function startComplete(a: IncidentAction) {
    setCompletingId(a.id)
    setCompletionNotes('')
    // Start from the record the measure planned to update (if any).
    setCompletedRecords(a.linkedRecords ?? [])
    setCarePlanVersionId('')
    setCancellingId(null)
    setRemovingId(null)
    if (mode !== 'closed') closeForm()
  }

  /** Quick status change from the card (Not started / In progress / Cancelled). */
  function changeStatus(a: IncidentAction, next: IncidentActionStatus) {
    if (next === a.status) return
    if (next === 'CANCELLED') {
      setCancellingId(a.id)
      setCancelReason('')
      setCompletingId(null)
      return
    }
    updateMutation.mutate({ actionId: a.id, input: { status: next } })
  }

  function confirmCancel(a: IncidentAction) {
    const reason = cancelReason.trim()
    if (a.isMandatory && !reason) return
    updateMutation.mutate(
      { actionId: a.id, input: { status: 'CANCELLED', ...(reason ? { reason } : {}) } },
      {
        onSuccess: () => {
          setCancellingId(null)
          setCancelReason('')
        },
      },
    )
  }

  function confirmComplete() {
    if (!completingId || !completionNotes.trim()) return
    const carePlan = completingAction?.measureType === 'CARE_PLAN_UPDATE'
    const needsRecord = !carePlan && measureNeedsCompletedRecord(completingAction?.measureType)
    if (carePlan && !carePlanVersionId) return
    if (needsRecord && !completedRecords.length) return
    completeMutation.mutate(
      {
        actionId: completingId,
        completionNotes: completionNotes.trim(),
        ...(carePlan ? { carePlanVersionId } : {}),
        ...(needsRecord ? { completedRecords } : {}),
      },
      {
        onSuccess: () => {
          setCompletingId(null)
          setCompletionNotes('')
        },
      },
    )
  }

  const formBusy = createMutation.isPending || updateMutation.isPending
  const open = actions.filter((a) => a.status !== 'COMPLETED' && a.status !== 'CANCELLED')
  const summary = [
    `${actions.length} measure${actions.length === 1 ? '' : 's'}`,
    `${actions.filter((a) => a.status === 'COMPLETED').length} completed`,
    ...(actions.some((a) => a.isOverdue) ? [`${actions.filter((a) => a.isOverdue).length} overdue`] : []),
    ...(open.some((a) => a.isMandatory)
      ? [`${open.filter((a) => a.isMandatory).length} mandatory open`]
      : []),
  ]

  return (
    <div className="space-y-3">
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No corrective measures yet.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{summary.join(' · ')}</p>
          <ul className="space-y-2">
            {actions.map((a) => {
              const typeLabel = incidentMeasureTypeLabel(a.measureType)
              const links = a.linkedRecords ?? []
              return (
                <li key={a.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                        {typeLabel && (
                          <Badge variant="info" size="sm">
                            {typeLabel}
                          </Badge>
                        )}
                        {a.title}
                        {a.isMandatory && (
                          <Badge variant="destructive" size="sm">
                            Mandatory
                          </Badge>
                        )}
                      </p>
                      {a.description && (
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">
                          {a.description}
                        </p>
                      )}
                      {a.newRecordNeeded && (
                        <p className="mt-1 text-xs font-medium text-foreground">
                          {INCIDENT_MEASURE_TYPE_OPTIONS.find((o) => o.value === a.measureType)
                            ?.newLabel ?? 'New record needed'}
                        </p>
                      )}
                      {links.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.measureType === 'COURSE'
                            ? `For ${links[0]?.label ?? 'carer'}${links[1] ? ` · ${links[1].label}` : ''}`
                            : `Linked: ${links.map((i) => i.label).join(', ')}`}
                        </p>
                      )}
                      {(a.addresses ?? []).length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Addresses: {(a.addresses ?? []).map(factorLabel).join(', ')}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant={INCIDENT_ACTION_STATUS_BADGE[a.displayStatus]} size="sm">
                          {INCIDENT_ACTION_STATUS_LABELS[a.displayStatus]}
                        </Badge>
                        <Badge variant={PRIORITY_BADGE[a.priority]} size="sm">
                          {PRIORITY_LABEL[a.priority]}
                        </Badge>
                        {a.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            Due {formatOrganisationIsoDateLong(a.dueDate.slice(0, 10))}
                          </span>
                        )}
                        {a.assignedEmployeeId && (
                          <span className="text-xs text-muted-foreground">
                            Assigned to {nameMap.get(a.assignedEmployeeId) ?? 'staff member'}
                          </span>
                        )}
                      </div>
                      {(a.completedRecords ?? []).length > 0 && (
                        <p className="mt-1.5 text-xs font-medium text-foreground">
                          Updated / added: {(a.completedRecords ?? []).map((i) => i.label).join(', ')}
                        </p>
                      )}
                      {a.completionNotes && (
                        <p className="mt-1.5 text-xs text-muted-foreground">✓ {a.completionNotes}</p>
                      )}
                      {a.measureType === 'CARE_PLAN_UPDATE' &&
                        a.status !== 'COMPLETED' &&
                        a.status !== 'CANCELLED' && (
                          <CarePlanOpenLinks
                            action={a}
                            incidentId={incidentId}
                            incidentRef={incidentReference}
                          />
                        )}
                    </div>
                    {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                      <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row sm:items-center">
                        {canManage && (
                          <select
                            className={`${selectClass} h-8`}
                            value={cancellingId === a.id ? 'CANCELLED' : a.status}
                            onChange={(e) => changeStatus(a, e.target.value as IncidentActionStatus)}
                            disabled={updateMutation.isPending}
                            aria-label={`Status of ${a.title}`}
                          >
                            <option value="NOT_STARTED">Not started</option>
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        )}
                        {canManage && (
                          <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                            <Pencil className="mr-1 h-4 w-4" /> Edit
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startComplete(a)}
                          disabled={completingId === a.id}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Mark as completed
                        </Button>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startRemove(a)}
                            disabled={removingId === a.id}
                            aria-label={`Remove ${a.title}`}
                            title="Remove (added by mistake)"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                    {a.status === 'CANCELLED' && canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0"
                        onClick={() => startRemove(a)}
                        disabled={removingId === a.id}
                        aria-label={`Remove ${a.title}`}
                        title="Remove (added by mistake)"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {removingId === a.id && (
                    <div className="mt-3 space-y-2 rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-3">
                      <label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Why remove this measure?
                        <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                      </label>
                      <Textarea
                        rows={2}
                        value={removeReason}
                        onChange={(e) => setRemoveReason(e.target.value)}
                        placeholder="e.g. Added by mistake / duplicate — kept in the audit log"
                      />
                      <p className="text-xs text-muted-foreground">
                        Use this for a measure added by mistake. If it was decided not to do it, set the
                        status to Cancelled instead.
                        {a.measureType === 'COURSE' ? ' This also cancels the carer’s learning assignment.' : ''}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          loading={removeMutation.isPending}
                          disabled={!removeReason.trim()}
                          onClick={() => confirmRemove(a)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" /> Remove measure
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRemovingId(null)
                            setRemoveReason('')
                          }}
                        >
                          Keep it
                        </Button>
                      </div>
                    </div>
                  )}

                  {cancellingId === a.id && (
                    <div className="mt-3 space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
                      <label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Why is this measure cancelled?
                        {a.isMandatory && (
                          <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                        )}
                      </label>
                      <Textarea
                        rows={2}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder={
                          a.isMandatory
                            ? 'Required for a mandatory measure — recorded in the audit log'
                            : 'Reason (optional)'
                        }
                      />
                      {a.measureType === 'COURSE' && (
                        <p className="text-xs text-muted-foreground">
                          This also cancels the carer’s learning assignment.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          loading={updateMutation.isPending}
                          disabled={a.isMandatory && !cancelReason.trim()}
                          onClick={() => confirmCancel(a)}
                        >
                          Cancel measure
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCancellingId(null)
                            setCancelReason('')
                          }}
                        >
                          Keep it
                        </Button>
                      </div>
                    </div>
                  )}

                  {completingId === a.id && (
                    <div className="mt-3 space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
                      {a.measureType === 'CARE_PLAN_UPDATE' && (
                        <CarePlanVersionPicker
                          actionId={a.id}
                          value={carePlanVersionId}
                          onChange={setCarePlanVersionId}
                        />
                      )}
                      {completingType?.newLabel &&
                        a.measureType !== 'CARE_PLAN_UPDATE' &&
                        completingType.pick !== 'none' &&
                        completingType.pick !== 'note' &&
                        completingType.pick !== 'course' && (
                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                              {completingType.pick === 'policy'
                                ? 'Which policy was updated or added?'
                                : completingType.pick === 'carePlan'
                                  ? 'Which care plan was updated or added?'
                                  : 'Which risk assessment was updated or added?'}
                              <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                            </p>
                            <RecordItemsPicker
                              pick={completingType.pick}
                              question={completingType.question}
                              items={completedRecords}
                              onChange={setCompletedRecords}
                              recordOptions={recordOptions}
                              involvedEmployees={involvedEmployees}
                              hasServiceUser={serviceUsers.length > 0}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">
                              Create or update it first (Policy Library / the service user’s records),
                              then choose it here.
                            </p>
                          </div>
                        )}
                      <label className="text-xs uppercase tracking-wide text-muted-foreground">
                        How was it completed?
                        <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                      </label>
                      <Textarea
                        rows={2}
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        placeholder="What was done — this is the evidence the measure was completed"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          loading={completeMutation.isPending}
                          disabled={
                            !completionNotes.trim() ||
                            (a.measureType === 'CARE_PLAN_UPDATE'
                              ? !carePlanVersionId
                              : measureNeedsCompletedRecord(a.measureType) && !completedRecords.length)
                          }
                          onClick={confirmComplete}
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Mark as completed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setCompletingId(null)
                            setCompletionNotes('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {canManage && (
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> Add corrective measure
        </Button>
      )}

      <Dialog open={formOpen} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit corrective measure' : 'Add corrective measure'}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="measure-type">
                    Type<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                  </label>
                  {mode === 'edit' ? (
                    <p className="mt-1 text-sm text-foreground">
                      {incidentMeasureTypeLabel(form.measureType) ?? 'Not set'}
                    </p>
                  ) : (
                    <select
                      id="measure-type"
                      className={`${selectClass} mt-1 w-full`}
                      value={form.measureType}
                      onChange={(e) =>
                        patch({
                          measureType: e.target.value as IncidentMeasureType | '',
                          linkedRecords: [],
                          courseEmployee: null,
                          course: null,
                        })
                      }
                    >
                      <option value="">Select type…</option>
                      {INCIDENT_MEASURE_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {typeOption?.hint && (
                    <p className="mt-1 text-xs text-muted-foreground">{typeOption.hint}</p>
                  )}
                </div>

                {typeOption?.pick === 'course' && mode === 'create' && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Carer<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                      </p>
                      <Combobox
                        value={form.courseEmployee?.id ?? ''}
                        onChange={(id) => {
                          const o = carerOptions.find((x) => x.value === id)
                          patch({ courseEmployee: o ? { id: o.value, label: o.label } : null })
                        }}
                        options={carerOptions}
                        onSearchChange={setCarerSearch}
                        loading={carersQuery.isLoading}
                        placeholder="Select carer"
                        searchPlaceholder="Search staff…"
                        emptyText="No staff match your search."
                      />
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                        Course<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                      </p>
                      <Combobox
                        value={form.course?.id ?? ''}
                        onChange={(id) => {
                          const o = courseOptions.find((x) => x.value === id)
                          patch({ course: o ? { id: o.value, label: o.label } : null })
                        }}
                        options={courseOptions}
                        onSearchChange={setCourseSearch}
                        loading={coursesQuery.isLoading}
                        placeholder="Select published course"
                        searchPlaceholder="Search courses…"
                        emptyText="No published courses match."
                      />
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      Creates a mandatory learning assignment for the carer (works for suspended carers too).
                      Cancelling the measure cancels the assignment.
                    </p>
                  </div>
                )}

                {typeOption?.newLabel && (
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {typeOption.question}
                      <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                    </p>
                    <div className="flex flex-wrap gap-3" role="radiogroup">
                      <label
                        className={`flex items-center gap-1.5 text-sm ${existingAvailable ? 'cursor-pointer text-foreground' : 'cursor-not-allowed text-muted-foreground'}`}
                      >
                        <input
                          type="radio"
                          name="measure-record-choice"
                          checked={!needNew}
                          disabled={!existingAvailable}
                          onChange={() => patch({ newRecordNeeded: false })}
                        />
                        Update existing
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground">
                        <input
                          type="radio"
                          name="measure-record-choice"
                          checked={needNew}
                          onChange={() => patch({ newRecordNeeded: true })}
                        />
                        {typeOption.newLabel}
                      </label>
                    </div>
                    {!existingAvailable && (
                      <p className="text-xs text-muted-foreground">
                        {typeOption.pick === 'policy'
                          ? 'The Policy Library is empty, so a new policy is needed.'
                          : serviceUsers.length === 0
                            ? 'No service user is linked to this incident, so there is nothing to update.'
                            : 'Nothing recorded for the service user yet, so a new one is needed.'}
                      </p>
                    )}
                  </div>
                )}

                {typeOption &&
                  typeOption.pick !== 'course' &&
                  typeOption.pick !== 'none' &&
                  typeOption.pick !== 'note' &&
                  !needNew &&
                  !(mode === 'edit' && form.measureType === 'COURSE') && (
                    <div>
                      {!typeOption.newLabel && (
                        <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {typeOption.question}
                          <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                        </p>
                      )}
                      <RecordItemsPicker
                        pick={typeOption.pick}
                        question={typeOption.question}
                        items={form.linkedRecords}
                        onChange={(items) => patch({ linkedRecords: items })}
                        recordOptions={recordOptions}
                        involvedEmployees={involvedEmployees}
                        hasServiceUser={serviceUsers.length > 0}
                      />
                    </div>
                  )}

                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="measure-title">
                    Title<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                  </label>
                  <Input
                    id="measure-title"
                    className="mt-1"
                    placeholder="Measure title"
                    value={form.titleEdited ? form.title : suggestedTitle(form, needNew)}
                    onChange={(e) => patch({ title: e.target.value, titleEdited: true })}
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wide text-muted-foreground" htmlFor="measure-description">
                    Description
                    {typeOption?.needsDescription ? (
                      <span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                    ) : (
                      <span className="normal-case"> (optional)</span>
                    )}
                  </label>
                  <Textarea
                    id="measure-description"
                    className="mt-1"
                    rows={2}
                    placeholder={typeOption?.needsDescription ? 'What will change?' : 'More detail (optional)'}
                    value={form.description}
                    onChange={(e) => patch({ description: e.target.value })}
                  />
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Addresses (optional)
                  </p>
                  {addressOptions.length === 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Record the root cause and contributing factors in the investigation to link this
                      measure to them.
                    </p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {addressOptions.map((code) => (
                        <label
                          key={code}
                          className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/40"
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-border"
                            checked={form.addresses.includes(code)}
                            onChange={() =>
                              patch({
                                addresses: form.addresses.includes(code)
                                  ? form.addresses.filter((c) => c !== code)
                                  : [...form.addresses, code],
                              })
                            }
                          />
                          {factorLabel(code)}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className={selectClass}
                    value={form.priority}
                    onChange={(e) => patch({ priority: e.target.value as IncidentActionPriority })}
                    aria-label="Priority"
                  >
                    <option value="LOW">Low priority</option>
                    <option value="MEDIUM">Medium priority</option>
                    <option value="HIGH">High priority</option>
                  </select>
                  {mode === 'edit' && form.status !== 'COMPLETED' && (
                    <select
                      className={selectClass}
                      value={form.status}
                      onChange={(e) => patch({ status: e.target.value as IncidentActionStatus })}
                      aria-label="Status"
                    >
                      <option value="NOT_STARTED">Not started</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  )}
                  <label className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                    <span>
                      Due<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                    </span>
                    <input
                      type="date"
                      className={selectClass}
                      value={form.dueDate}
                      onChange={(e) => patch({ dueDate: e.target.value })}
                      aria-label="Due date"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={form.isMandatory}
                      onChange={(e) => patch({ isMandatory: e.target.checked })}
                      className="h-4 w-4 rounded border-border"
                    />
                    Mandatory
                  </label>
                </div>
                {droppingMandatory && (
                  <div className="space-y-1">
                    <p className="text-xs text-warning">
                      {form.status === 'CANCELLED'
                        ? 'This is a mandatory measure. Give a reason for cancelling it — it will be recorded in the audit log.'
                        : 'This is a mandatory measure. Give a reason for making it optional — it will be recorded in the audit log.'}
                    </p>
                    <Textarea
                      rows={2}
                      placeholder="Reason (required)"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                    />
                  </div>
                )}
                {mode === 'edit' &&
                  editingOriginal?.measureType === 'COURSE' &&
                  form.status === 'CANCELLED' &&
                  editingOriginal.status !== 'CANCELLED' && (
                    <p className="text-xs text-muted-foreground">
                      Cancelling this measure also cancels the carer’s learning assignment.
                    </p>
                  )}
                <div>
                  <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Responsible person<span className="ml-0.5 text-destructive dark:text-red-400">*</span>
                  </p>
                  <Combobox
                    value={form.assignedEmployeeId}
                    onChange={(v) => patch({ assignedEmployeeId: v })}
                    options={employeeOptions}
                    onSearchChange={setEmpSearch}
                    loading={employeesQuery.isLoading}
                    placeholder="Who makes sure this happens"
                    searchPlaceholder="Search staff…"
                    allowDeselect
                    emptyText="No staff match your search."
                  />
                </div>
                {missing.length > 0 && (
                  <p className="text-xs text-muted-foreground">Still needed: {missing.join(', ')}.</p>
                )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>
              Cancel
            </Button>
            <Button loading={formBusy} onClick={submitForm} disabled={!canSubmit}>
              {mode === 'edit' ? 'Save measure' : 'Add measure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
