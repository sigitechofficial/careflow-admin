import * as React from 'react'
import { CheckCircle2, Pencil, Plus, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/form-field'
import { Badge } from '@/shared/ui/badge'
import { Combobox, type ComboboxOption } from '@/shared/ui/combobox'
import { formatOrganisationIsoDateLong } from '@/shared/lib/organisation-display-format.store'
import { useEmployees } from '@/features/employees/hooks/useEmployees'
import { useEmployeeNameMap } from '@/features/employees/hooks/useEmployeeNameMap'
import {
  useCompleteIncidentAction,
  useCreateIncidentAction,
  useUpdateIncidentAction,
} from '@/features/incidents/hooks/useIncidents'
import {
  INCIDENT_ACTION_STATUS_BADGE,
  INCIDENT_ACTION_STATUS_LABELS,
  type CreateIncidentActionInput,
  type IncidentAction,
  type IncidentActionPriority,
  type IncidentActionStatus,
  type UpdateIncidentActionInput,
} from '@/features/incidents/types'

const PRIORITY_BADGE: Record<IncidentActionPriority, 'muted' | 'warning' | 'destructive'> = {
  LOW: 'muted',
  MEDIUM: 'warning',
  HIGH: 'destructive',
}

const selectClass =
  'h-9 rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

type FormState = {
  title: string
  description: string
  priority: IncidentActionPriority
  dueDate: string
  assignedEmployeeId: string
  isMandatory: boolean
  status: IncidentActionStatus
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: '',
  assignedEmployeeId: '',
  isMandatory: false,
  status: 'NOT_STARTED',
}

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

function actionToForm(a: IncidentAction): FormState {
  return {
    title: a.title,
    description: a.description ?? '',
    priority: a.priority,
    dueDate: toDateInput(a.dueDate),
    assignedEmployeeId: a.assignedEmployeeId ?? '',
    isMandatory: a.isMandatory,
    status: a.status,
  }
}

export function IncidentActionsSection({
  incidentId,
  actions,
  canManage,
}: {
  incidentId: string
  actions: IncidentAction[]
  canManage: boolean
}) {
  const createMutation = useCreateIncidentAction(incidentId)
  const updateMutation = useUpdateIncidentAction()
  const completeMutation = useCompleteIncidentAction()

  const [mode, setMode] = React.useState<'closed' | 'create' | 'edit'>('closed')
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY_FORM)

  const [completingId, setCompletingId] = React.useState<string | null>(null)
  const [completionNotes, setCompletionNotes] = React.useState('')

  const [empSearch, setEmpSearch] = React.useState('')
  const employeesQuery = useEmployees({ limit: 50, search: empSearch || undefined })
  const assigneeIds = React.useMemo(
    () => actions.map((a) => a.assignedEmployeeId).filter((id): id is string => Boolean(id)),
    [actions],
  )
  const nameMap = useEmployeeNameMap(assigneeIds)

  const employeeOptions: ComboboxOption[] = React.useMemo(() => {
    const rows = (employeesQuery.data?.rows ?? []).map((r) => ({
      value: r.id,
      label: r.fullName || [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unnamed',
      description: r.jobTitle?.name ?? undefined,
    }))
    // Keep the current assignee visible even if not in the latest search results.
    if (form.assignedEmployeeId && !rows.some((r) => r.value === form.assignedEmployeeId)) {
      const name = nameMap.get(form.assignedEmployeeId)
      if (name) {
        rows.unshift({ value: form.assignedEmployeeId, label: name, description: undefined })
      }
    }
    return rows
  }, [employeesQuery.data, form.assignedEmployeeId, nameMap])

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
  }

  function submitForm() {
    if (!form.title.trim()) return
    const dueDate = form.dueDate ? new Date(form.dueDate).toISOString() : undefined
    const assignedEmployeeId = form.assignedEmployeeId || undefined

    if (mode === 'edit' && editingId) {
      const input: UpdateIncidentActionInput = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        assignedEmployeeId: form.assignedEmployeeId || null,
        isMandatory: form.isMandatory,
        status: form.status,
      }
      updateMutation.mutate(
        { actionId: editingId, input },
        { onSuccess: () => closeForm() },
      )
      return
    }

    const input: CreateIncidentActionInput = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      priority: form.priority,
      dueDate,
      assignedEmployeeId,
      isMandatory: form.isMandatory,
    }
    createMutation.mutate(input, { onSuccess: () => closeForm() })
  }

  function startComplete(a: IncidentAction) {
    setCompletingId(a.id)
    setCompletionNotes('')
    if (mode !== 'closed') closeForm()
  }

  function confirmComplete() {
    if (!completingId) return
    completeMutation.mutate(
      {
        actionId: completingId,
        completionNotes: completionNotes.trim() || undefined,
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

  return (
    <div className="space-y-3">
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No corrective measures yet.</p>
      ) : (
        <ul className="space-y-2">
          {actions.map((a) => (
            <li key={a.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
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
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant={INCIDENT_ACTION_STATUS_BADGE[a.displayStatus]} size="sm">
                      {INCIDENT_ACTION_STATUS_LABELS[a.displayStatus]}
                    </Badge>
                    <Badge variant={PRIORITY_BADGE[a.priority]} size="sm">
                      {a.priority}
                    </Badge>
                    {a.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Due {formatOrganisationIsoDateLong(a.dueDate)}
                      </span>
                    )}
                    {a.assignedEmployeeId && (
                      <span className="text-xs text-muted-foreground">
                        Assigned to {nameMap.get(a.assignedEmployeeId) ?? 'staff member'}
                      </span>
                    )}
                  </div>
                  {a.completionNotes && (
                    <p className="mt-1.5 text-xs text-muted-foreground">✓ {a.completionNotes}</p>
                  )}
                </div>
                {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                  <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
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
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Complete
                    </Button>
                  </div>
                )}
              </div>

              {completingId === a.id && (
                <div className="mt-3 space-y-2 rounded-md border border-dashed border-border bg-muted/30 p-3">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Completion notes (optional)
                  </label>
                  <Textarea
                    rows={2}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="How was this measure completed?"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" loading={completeMutation.isPending} onClick={confirmComplete}>
                      <CheckCircle2 className="mr-1 h-4 w-4" /> Confirm complete
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
          ))}
        </ul>
      )}

      {canManage &&
        (mode !== 'closed' ? (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {mode === 'edit' ? 'Edit corrective measure' : 'Add corrective measure'}
              </p>
              <Button size="sm" variant="ghost" onClick={closeForm} aria-label="Close form">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Measure title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <Textarea
              rows={2}
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className={selectClass}
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as IncidentActionPriority }))
                }
                aria-label="Priority"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              {mode === 'edit' && form.status !== 'COMPLETED' && (
                <select
                  className={selectClass}
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as IncidentActionStatus }))
                  }
                  aria-label="Status"
                >
                  <option value="NOT_STARTED">Not started</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              )}
              <input
                type="date"
                className={selectClass}
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                aria-label="Due date"
              />
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={form.isMandatory}
                  onChange={(e) => setForm((f) => ({ ...f, isMandatory: e.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                Mandatory
              </label>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Assign to
              </p>
              <Combobox
                value={form.assignedEmployeeId}
                onChange={(v) => setForm((f) => ({ ...f, assignedEmployeeId: v }))}
                options={employeeOptions}
                onSearchChange={setEmpSearch}
                loading={employeesQuery.isLoading}
                placeholder="Select staff member (optional)"
                searchPlaceholder="Search staff…"
                allowDeselect
                emptyText="No staff match your search."
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={formBusy}
                onClick={submitForm}
                disabled={!form.title.trim()}
              >
                {mode === 'edit' ? 'Save measure' : 'Add measure'}
              </Button>
              <Button size="sm" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add corrective measure
          </Button>
        ))}
    </div>
  )
}
