import * as React from 'react'
import { Eye, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { ApiError } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/toggle-controls'
import { Label } from '@/shared/ui/form-field'
import { cn } from '@/shared/lib/utils'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useAuthStore } from '@/features/auth/store'
import {
  flattenTaskCatalogueCategories,
  type TaskCatalogueAdminGroup,
  type TaskCatalogueAdminTask,
} from '@/features/settings/api/task-catalogue-admin.api'
import {
  useCreateTaskCatalogueTask,
  useDeleteTaskCatalogueTask,
  useTaskCatalogueAdmin,
  useUpdateTaskCatalogueTask,
} from '@/features/settings/hooks/useTaskCatalogueAdmin'

const GROUP_LABELS: Record<string, string> = {
  personal_care: 'Personal care',
  observations_monitoring: 'Observations & monitoring',
  condition_specific: 'Condition-specific care',
  equipment_ipc: 'Equipment & infection control',
  shopping_errands: 'Shopping & errands',
}

// 24 Aug 2026: catalogue flags (feedsObservation etc.) were in DB only — list hid
// why the employee app shows an Obs tag. Surface that read-only here.
const OBSERVATION_FEED_LABELS: Record<string, string> = {
  skin_integrity: 'Skin integrity',
  body_map: 'Body map',
  continence: 'Continence',
  bowel: 'Bowel',
  diabetes: 'Blood glucose',
  pain: 'Pain',
  vitals: 'Vitals',
  repositioning_chart: 'Repositioning',
}

function observationFeedLabels(flagsJson: Record<string, unknown> | null | undefined): string[] {
  const feeds = flagsJson?.feedsObservation
  if (!Array.isArray(feeds)) return []
  return feeds
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .map((code) => OBSERVATION_FEED_LABELS[code] ?? code.replace(/_/g, ' '))
}

const OBSERVATION_FEED_HELP: Record<string, string> = {
  skin_integrity:
    'On the employee app this task opens an observation first: check the person’s skin during the task and record what you see (redness, sores, rash, pressure marks — or that skin looks intact). The task completes after that record is saved.',
  body_map:
    'On the employee app this task opens a body-map observation first so the carer can mark and describe skin sites before the task is completed.',
  continence:
    'On the employee app this task opens a continence observation first so pad/toilet output can be recorded before the task is completed.',
  bowel:
    'On the employee app this task opens a bowel observation first so the movement can be recorded before the task is completed.',
  diabetes:
    'On the employee app this task opens a blood glucose observation first; the carer must enter the reading before the task is completed.',
  pain:
    'On the employee app this task opens a pain observation first so the score or description is recorded before the task is completed.',
  vitals:
    'On the employee app this task opens a vitals observation first so readings are recorded before the task is completed.',
  repositioning_chart:
    'On the employee app this task opens a repositioning observation first so position and timing are recorded before the task is completed.',
}

function observationHelpText(flagsJson: Record<string, unknown> | null | undefined): string | null {
  const feeds = flagsJson?.feedsObservation
  if (!Array.isArray(feeds)) return null
  const codes = feeds
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
  if (codes.length === 0) return null
  const parts = codes.map(
    (code) =>
      OBSERVATION_FEED_HELP[code] ??
      `On the employee app this task opens a ${OBSERVATION_FEED_LABELS[code] ?? code.replace(/_/g, ' ')} observation first; the carer records it before the task is completed.`,
  )
  return [...new Set(parts)].join(' ')
}

function completionInputLabel(flagsJson: Record<string, unknown> | null | undefined): string | null {
  const raw = flagsJson?.completionInput
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const mode = (raw as { inputMode?: unknown }).inputMode
  if (typeof mode !== 'string' || !mode.trim()) return null
  // 24 Aug 2026: "Complete by tick" read as jargon — tick is the default, so hide it.
  if (mode === 'tick') return null
  if (mode === 'value') return 'Carer must enter a reading'
  if (mode === 'note') return 'Carer must add a note'
  if (mode === 'value_and_note') return 'Carer must enter a reading and a note'
  return `Carer completes with ${mode.replace(/_/g, ' ')}`
}

const INPUT_MODE_LABEL: Record<string, string> = {
  tick: 'Tick to complete',
  value: 'Value',
  note: 'Note',
  value_and_note: 'Value + note',
}

type CompletionSpec = {
  inputMode: string
  valueLabel?: string
  valuePlaceholder?: string
  noteLabel?: string
  notePlaceholder?: string
}

// Read-only completion spec from flagsJson.completionInput (backend-computed).
function completionInputSpec(
  flagsJson: Record<string, unknown> | null | undefined,
): CompletionSpec | null {
  const raw = flagsJson?.completionInput
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const obj = raw as Record<string, unknown>
  const mode = typeof obj.inputMode === 'string' && obj.inputMode.trim() ? obj.inputMode : null
  if (!mode) return null
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v : undefined)
  return {
    inputMode: mode,
    valueLabel: str(obj.valueLabel),
    valuePlaceholder: str(obj.valuePlaceholder),
    noteLabel: str(obj.noteLabel),
    notePlaceholder: str(obj.notePlaceholder),
  }
}

function evidenceList(flagsJson: Record<string, unknown> | null | undefined): string[] {
  const ev = flagsJson?.evidenceRequired
  return Array.isArray(ev) ? ev.filter((x): x is string => typeof x === 'string') : []
}

function flagBool(flagsJson: Record<string, unknown> | null | undefined, key: string): boolean {
  return flagsJson?.[key] === true
}

function flagString(
  flagsJson: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const v = flagsJson?.[key]
  return typeof v === 'string' && v.trim() ? v : null
}

// Plain-English, non-medical explanation of each carer field (keyed by its label).
const FIELD_HELP: Record<string, string> = {
  // Value fields
  Weight: 'The person’s body weight.',
  Temperature: 'Body temperature reading.',
  'Blood pressure': 'The blood pressure reading — top number over bottom number.',
  Pulse: 'Heartbeats per minute.',
  SpO2: 'Oxygen level in the blood, shown as a percentage.',
  'Blood glucose': 'The blood sugar reading.',
  'Pain score': 'How much pain the person is in — usually 0 (none) to 10 (worst).',
  'Fluid intake': 'How much the person drank, in millilitres (ml).',
  'Fluid balance': 'The difference between fluids taken in and passed out.',
  'NEWS2 score': 'An early-warning score showing how unwell someone is.',
  'Units given': 'How many units of insulin you gave.',
  'Volume given': 'How much feed you gave through the tube, in millilitres (ml).',
  'Oxygen / flow rate': 'The oxygen setting, e.g. litres per minute.',
  'Dressing / wound status': 'The state of the wound or dressing, e.g. clean, dry, intact.',
  Position: 'Which position you moved the person into, e.g. left side.',
  // Note fields
  'Injection site': 'Where on the body you injected — change the spot each time to protect the skin.',
  'Vitals summary': 'A short summary of the readings you took (BP, pulse, temp, oxygen, alertness).',
  'Feeding notes': 'How the feed went — did they tolerate it, any leftovers.',
  'Respiratory notes': 'How their breathing was — any difficulty or unusual sounds.',
  'Wound care notes': 'What the wound looked like and what you did (site, any fluid, action taken).',
  'Repositioning notes': 'Skin check and how comfortable they were after moving.',
  'Behaviour notes': 'What happened, what set it off, and what you did to help.',
  'Seizure details': 'How long the seizure lasted, what type, and how they recovered.',
  'Seizure record': 'How long the seizure lasted, what type, and how they recovered.',
  'Mood notes': 'How the person seemed in themselves today.',
  'Sleep notes': 'How they slept — quality and any disturbances.',
  'Bowel / continence notes': 'Toileting details — stool type (Bristol scale) and continence.',
  'Bowel record': 'Bowel movement details using the Bristol stool scale.',
  'Food / nutrition notes': 'What they ate, how much, and their appetite.',
  'Catheter care notes': 'Urine output and how the catheter site looked.',
  'Stoma care notes': 'How the stoma looked, its output, and any bag change.',
  'Errand details': 'What errand you did, receipts, and any change.',
  'Equipment issue': 'What is faulty or unsafe and what you did about it.',
  'Equipment notes': 'Equipment used and its safety-check status.',
  'Stock check notes': 'Items you checked and anything running low.',
  'Supply check notes': 'Consumables that are low or out of stock.',
  'Shopping notes': 'Items bought, amount spent, and change.',
  'Food safety notes': 'Use-by dates checked and anything thrown out.',
  'Skin check notes': 'Areas of skin you checked and any concerns.',
  'PPE used': 'Protective items you wore, e.g. gloves, apron, mask.',
  'Errand notes': 'What was done during the errand.',
}

function fieldHelp(label: string | undefined | null): string | null {
  if (!label) return null
  return FIELD_HELP[label] ?? null
}

const INPUT_MODE_HELP: Record<string, string> = {
  tick: 'The carer just marks this task as done — no extra details to type.',
  value: 'The carer types in one reading or measurement.',
  note: 'The carer writes a short note about what they saw or did.',
  value_and_note: 'The carer enters a reading and also writes a short note.',
}

// Plain-English meaning of each property label in the detail dialog.
const FIELD_MEANING: Record<string, string> = {
  'Opens observation':
    'Before finishing, the app opens this observation form so the carer records it first.',
  'Consent required':
    'The person (or their representative) must have agreed. The carer confirms consent before doing it.',
  'Competency gated': 'Only carers trained and signed off for this skill are allowed to do it.',
  'Support level applies':
    'The carer records how much help was needed — e.g. prompting, supervising, or full assistance.',
  'Requires 2+ carers': 'This task needs two carers present to be done safely.',
  'Out of scope': 'This is outside what carers may do — they should flag or refer it, not do it.',
  'Evidence required': 'The carer must attach proof — e.g. a photo or a note — to complete it.',
  Recurring: 'This task repeats on a schedule rather than being a one-off.',
  Mandatory: 'This task must be done — it cannot be skipped.',
  'Senior only': 'Only senior staff can carry out this task.',
  'Default horizon': 'How far ahead this task is planned by default (e.g. this week).',
  'Internal note': 'An office-only note about this task — carers do not see it.',
}

type TaskFormState = {
  categoryId: string
  name: string
  consentRequired: boolean
  supportLevelApplicable: boolean
  competencyGated: boolean
  competency: string
  outOfScope: boolean
  requiresMultipleCarers: boolean
  isActive: boolean
}

const EMPTY_FORM: TaskFormState = {
  categoryId: '',
  name: '',
  consentRequired: false,
  supportLevelApplicable: false,
  competencyGated: false,
  competency: '',
  outOfScope: false,
  requiresMultipleCarers: false,
  isActive: true,
}

function taskMatchesFilter(task: TaskCatalogueAdminTask, query: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  if (task.name.toLowerCase().includes(q)) return true
  return observationFeedLabels(task.flagsJson).some((label) => label.toLowerCase().includes(q))
}

export function TaskCatalogueSettingsPanel() {
  const canManage =
    useAuthStore((s) => s.can('task_catalogue.manage')) || useAuthStore((s) => s.can('lookups.manage'))
  const listQuery = useTaskCatalogueAdmin()
  const createMutation = useCreateTaskCatalogueTask()
  const updateMutation = useUpdateTaskCatalogueTask()
  const deleteMutation = useDeleteTaskCatalogueTask()

  const [filter, setFilter] = React.useState('')
  const [groupFilter, setGroupFilter] = React.useState<string>('ALL')
  const [addForm, setAddForm] = React.useState<TaskFormState>(EMPTY_FORM)
  const [editTask, setEditTask] = React.useState<TaskCatalogueAdminTask | null>(null)
  const [editForm, setEditForm] = React.useState<TaskFormState>(EMPTY_FORM)
  const [viewTask, setViewTask] = React.useState<TaskCatalogueAdminTask | null>(null)
  const [viewCategoryName, setViewCategoryName] = React.useState<string>('')
  const [actionError, setActionError] = React.useState<string | null>(null)

  const groups = listQuery.data ?? []
  const categoryOptions = React.useMemo(() => flattenTaskCatalogueCategories(groups), [groups])

  React.useEffect(() => {
    if (addForm.categoryId || categoryOptions.length === 0) return
    setAddForm((prev) => ({ ...prev, categoryId: categoryOptions[0]?.id ?? '' }))
  }, [addForm.categoryId, categoryOptions])

  const filteredGroups = React.useMemo(() => {
    const q = filter.trim().toLowerCase()
    return groups
      .filter((group) => groupFilter === 'ALL' || group.code === groupFilter)
      .map((group) => ({
        ...group,
        categories: group.categories
          .map((category) => ({
            ...category,
            tasks: category.tasks.filter((task) => taskMatchesFilter(task, q)),
          }))
          .filter((category) => category.tasks.length > 0),
      }))
      .filter((group) => group.categories.length > 0)
  }, [filter, groupFilter, groups])

  const totalTasks = React.useMemo(
    () => groups.reduce((sum, group) => sum + group.categories.reduce((c, cat) => c + cat.tasks.length, 0), 0),
    [groups],
  )

  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending
  const loadError =
    listQuery.error instanceof ApiError
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load task catalogue.'
        : null

  const openEdit = (task: TaskCatalogueAdminTask, categoryId: string) => {
    setEditTask(task)
    setEditForm({
      categoryId,
      name: task.name,
      consentRequired: task.consentRequired,
      supportLevelApplicable: task.supportLevelApplicable,
      competencyGated: task.competencyGated,
      competency: task.competency ?? '',
      outOfScope: task.outOfScope,
      requiresMultipleCarers: task.requiresMultipleCarers,
      isActive: task.isActive,
    })
    setActionError(null)
  }

  const closeEdit = () => {
    setEditTask(null)
    setEditForm(EMPTY_FORM)
  }

  const openView = (task: TaskCatalogueAdminTask, categoryName: string) => {
    setViewTask(task)
    setViewCategoryName(categoryName)
  }

  const onAdd = async () => {
    if (!canManage) return
    const name = addForm.name.trim()
    if (!name || !addForm.categoryId) return
    setActionError(null)
    try {
      await createMutation.mutateAsync({
        categoryId: addForm.categoryId,
        name,
        consentRequired: addForm.consentRequired,
        supportLevelApplicable: addForm.supportLevelApplicable,
        competencyGated: addForm.competencyGated,
        competency: addForm.competencyGated ? addForm.competency.trim() || undefined : undefined,
        outOfScope: addForm.outOfScope,
        requiresMultipleCarers: addForm.requiresMultipleCarers,
      })
      setAddForm((prev) => ({ ...EMPTY_FORM, categoryId: prev.categoryId }))
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not add task.')
    }
  }

  const onSaveEdit = async () => {
    if (!canManage || !editTask) return
    const name = editForm.name.trim()
    if (!name || !editForm.categoryId) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: editTask.id,
        body: {
          categoryId: editForm.categoryId,
          name,
          consentRequired: editForm.consentRequired,
          supportLevelApplicable: editForm.supportLevelApplicable,
          competencyGated: editForm.competencyGated,
          competency: editForm.competencyGated ? editForm.competency.trim() || null : null,
          outOfScope: editForm.outOfScope,
          requiresMultipleCarers: editForm.requiresMultipleCarers,
          isActive: editForm.isActive,
        },
      })
      closeEdit()
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not save task.')
    }
  }

  const onDelete = async (task: TaskCatalogueAdminTask) => {
    if (!canManage) return
    if (!window.confirm(`Remove "${task.name}" from the task catalogue?`)) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(task.id)
      if (editTask?.id === task.id) closeEdit()
    } catch (error) {
      setActionError(error instanceof ApiError ? error.message : 'Could not remove task.')
    }
  }

  const onToggleRequiresMultipleCarers = async (
    task: TaskCatalogueAdminTask,
    requiresMultipleCarers: boolean,
  ) => {
    if (!canManage) return
    setActionError(null)
    try {
      await updateMutation.mutateAsync({
        id: task.id,
        body: { requiresMultipleCarers },
      })
      if (editTask?.id === task.id) {
        setEditForm((prev) => ({ ...prev, requiresMultipleCarers }))
      }
    } catch (error) {
      setActionError(
        error instanceof ApiError ? error.message : 'Could not update multi-carer requirement.',
      )
    }
  }

  const displayError = actionError ?? loadError

  if (listQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading task catalogue…
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Tasks planner</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Master list of visit tasks used in the service user Tasks Planner and when recording visits.
          {totalTasks > 0 ? ` ${totalTasks} tasks configured.` : ''}
        </p>
      </div>

      {displayError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {displayError}
        </p>
      ) : null}

      {canManage ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Add task</p>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_auto] lg:items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select
                value={addForm.categoryId || undefined}
                onValueChange={(value) => setAddForm((prev) => ({ ...prev, categoryId: value }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectGroup key={group.id}>
                      <SelectLabel>{GROUP_LABELS[group.code] ?? group.code}</SelectLabel>
                      {group.categories
                        .filter((category) => category.isActive)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Task name</Label>
              <Input
                value={addForm.name}
                placeholder="e.g. Blood glucose reading"
                disabled={saving}
                onChange={(event) => setAddForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <Button type="button" disabled={saving || !addForm.name.trim()} onClick={() => void onAdd()}>
              {createMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add task
            </Button>
          </div>
          <TaskOptionCheckboxes
            form={addForm}
            disabled={saving}
            onChange={(patch) => setAddForm((prev) => ({ ...prev, ...patch }))}
            showActive={false}
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter tasks…"
          className="sm:max-w-xs"
        />
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All groups</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.code}>
                {GROUP_LABELS[group.code] ?? group.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-6">
        {filteredGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks match your filter.</p>
        ) : (
          filteredGroups.map((group) => (
            <TaskGroupSection
              key={group.id}
              group={group}
              canManage={canManage}
              saving={saving}
              onView={openView}
              onEdit={openEdit}
              onDelete={(task) => void onDelete(task)}
              onToggleRequiresMultipleCarers={(task, value) =>
                void onToggleRequiresMultipleCarers(task, value)
              }
            />
          ))
        )}
      </div>

      <Dialog open={Boolean(editTask)} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select
                value={editForm.categoryId || undefined}
                onValueChange={(value) => setEditForm((prev) => ({ ...prev, categoryId: value }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectGroup key={group.id}>
                      <SelectLabel>{GROUP_LABELS[group.code] ?? group.code}</SelectLabel>
                      {group.categories
                        .filter((category) => category.isActive)
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Task name</Label>
              <Input
                value={editForm.name}
                disabled={saving}
                onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <TaskOptionCheckboxes
              form={editForm}
              disabled={saving}
              onChange={(patch) => setEditForm((prev) => ({ ...prev, ...patch }))}
              showActive
            />
            {editTask ? <TaskLinkedDetails task={editTask} /> : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEdit} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onSaveEdit()} disabled={saving || !editForm.name.trim()}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        task={viewTask}
        categoryName={viewCategoryName}
        onClose={() => setViewTask(null)}
      />
    </div>
  )
}

function TaskOptionCheckboxes({
  form,
  disabled,
  onChange,
  showActive,
}: {
  form: TaskFormState
  disabled?: boolean
  onChange: (patch: Partial<TaskFormState>) => void
  showActive?: boolean
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.consentRequired}
          disabled={disabled}
          onCheckedChange={(value) => onChange({ consentRequired: value === true })}
        />
        Consent relevant
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.supportLevelApplicable}
          disabled={disabled}
          onCheckedChange={(value) => onChange({ supportLevelApplicable: value === true })}
        />
        Support level applies
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.competencyGated}
          disabled={disabled}
          onCheckedChange={(value) => onChange({ competencyGated: value === true })}
        />
        Competency gated
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.outOfScope}
          disabled={disabled}
          onCheckedChange={(value) => onChange({ outOfScope: value === true })}
        />
        Out of scope for carer
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.requiresMultipleCarers}
          disabled={disabled}
          onCheckedChange={(value) => onChange({ requiresMultipleCarers: value === true })}
        />
        Requires more than 1 carer
      </label>
      {showActive ? (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.isActive}
            disabled={disabled}
            onCheckedChange={(value) => onChange({ isActive: value === true })}
          />
          Active
        </label>
      ) : null}
      {form.competencyGated ? (
        <Input
          value={form.competency}
          disabled={disabled}
          placeholder="Required competency"
          className="h-8 max-w-xs text-sm"
          onChange={(event) => onChange({ competency: event.target.value })}
        />
      ) : null}
    </div>
  )
}

function TaskLinkedDetails({
  task,
  compact = false,
}: {
  task: TaskCatalogueAdminTask
  compact?: boolean
}) {
  const help = observationHelpText(task.flagsJson)
  const completion = completionInputLabel(task.flagsJson)
  if (!help && !completion) return null

  return (
    <p className={cn('text-xs leading-5 text-muted-foreground', compact ? 'mt-1.5' : 'rounded-md border border-border bg-muted/20 px-3 py-2')}>
      {help}
      {help && completion ? ' ' : null}
      {completion ? `${completion}.` : null}
    </p>
  )
}

function DetailBadge({
  tone,
  children,
}: {
  tone: 'required' | 'optional'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase',
        tone === 'required'
          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

function DetailRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string | null
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border py-2 first:border-t-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        {hint ? (
          <span className="mt-0.5 max-w-[15rem] text-[11px] italic leading-4 text-muted-foreground/80">
            {hint}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 text-right text-sm text-foreground">{children}</span>
    </div>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="rounded-md border border-border bg-muted/10 px-3">{children}</div>
    </div>
  )
}

function TaskDetailDialog({
  task,
  categoryName,
  onClose,
}: {
  task: TaskCatalogueAdminTask | null
  categoryName: string
  onClose: () => void
}) {
  const spec = completionInputSpec(task?.flagsJson)
  const mode = spec?.inputMode ?? 'tick'
  const valueRequired = mode === 'value' || mode === 'value_and_note'
  const noteRequired = mode === 'note' || mode === 'value_and_note'
  const obs = task ? observationFeedLabels(task.flagsJson) : []
  const evidence = task ? evidenceList(task.flagsJson) : []
  const horizon = flagString(task?.flagsJson, 'defaultHorizon')
  const internalNote = flagString(task?.flagsJson, 'note')
  const yesNo = (v: boolean) => (v ? 'Yes' : 'No')

  return (
    <Dialog open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{task?.name ?? 'Task details'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {task ? (
            <>
              <DetailSection title="Overview">
                <DetailRow label="Category">{categoryName || '—'}</DetailRow>
                <DetailRow label="Status">{task.isActive ? 'Active' : 'Inactive'}</DetailRow>
              </DetailSection>

              <DetailSection title="What the carer records">
                <DetailRow label="Input type">
                  <span className="flex flex-col items-end gap-1">
                    <span>{INPUT_MODE_LABEL[mode] ?? mode}</span>
                    {INPUT_MODE_HELP[mode] ? (
                      <span className="max-w-[17rem] text-xs italic text-muted-foreground">
                        {INPUT_MODE_HELP[mode]}
                      </span>
                    ) : null}
                  </span>
                </DetailRow>
                <DetailRow label="Outcome">
                  <span className="flex items-center justify-end gap-2">
                    Completed / Partial / Declined
                    <DetailBadge tone="required">Required</DetailBadge>
                  </span>
                </DetailRow>
                {spec?.valueLabel ? (
                  <DetailRow label="Value field">
                    <span className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-2">
                        {spec.valueLabel}
                        <DetailBadge tone={valueRequired ? 'required' : 'optional'}>
                          {valueRequired ? 'Required' : 'Optional'}
                        </DetailBadge>
                      </span>
                      {spec.valuePlaceholder ? (
                        <span className="text-xs text-muted-foreground">e.g. {spec.valuePlaceholder}</span>
                      ) : null}
                      {fieldHelp(spec.valueLabel) ? (
                        <span className="max-w-[17rem] text-xs italic text-muted-foreground">
                          {fieldHelp(spec.valueLabel)}
                        </span>
                      ) : null}
                    </span>
                  </DetailRow>
                ) : null}
                {spec?.noteLabel ? (
                  <DetailRow label="Note field">
                    <span className="flex flex-col items-end gap-1">
                      <span className="flex items-center gap-2">
                        {spec.noteLabel}
                        <DetailBadge tone={noteRequired ? 'required' : 'optional'}>
                          {noteRequired ? 'Required' : 'Optional'}
                        </DetailBadge>
                      </span>
                      {spec.notePlaceholder ? (
                        <span className="text-xs text-muted-foreground">e.g. {spec.notePlaceholder}</span>
                      ) : null}
                      {fieldHelp(spec.noteLabel) ? (
                        <span className="max-w-[17rem] text-xs italic text-muted-foreground">
                          {fieldHelp(spec.noteLabel)}
                        </span>
                      ) : null}
                    </span>
                  </DetailRow>
                ) : null}
                {mode === 'tick' ? (
                  <DetailRow label="Extra fields">None — completes with a tick</DetailRow>
                ) : null}
              </DetailSection>

              <DetailSection title="Routing">
                <DetailRow
                  label="Opens observation"
                  hint={obs.length ? FIELD_MEANING['Opens observation'] : 'Recorded directly on the task sheet.'}
                >
                  {obs.length ? obs.join(', ') : 'None — recorded on the task sheet'}
                </DetailRow>
              </DetailSection>

              <DetailSection title="Governance & safety">
                <DetailRow label="Consent required" hint={FIELD_MEANING['Consent required']}>
                  {yesNo(task.consentRequired)}
                </DetailRow>
                <DetailRow label="Competency gated" hint={FIELD_MEANING['Competency gated']}>
                  {task.competencyGated
                    ? task.competency
                      ? `Yes · ${task.competency.replace(/_/g, ' ')}`
                      : 'Yes'
                    : 'No'}
                </DetailRow>
                <DetailRow label="Support level applies" hint={FIELD_MEANING['Support level applies']}>
                  {yesNo(task.supportLevelApplicable)}
                </DetailRow>
                <DetailRow label="Requires 2+ carers" hint={FIELD_MEANING['Requires 2+ carers']}>
                  {yesNo(task.requiresMultipleCarers)}
                </DetailRow>
                <DetailRow label="Out of scope" hint={FIELD_MEANING['Out of scope']}>
                  {yesNo(task.outOfScope)}
                </DetailRow>
                <DetailRow label="Evidence required" hint={FIELD_MEANING['Evidence required']}>
                  {evidence.length ? evidence.map((e) => e.replace(/_/g, ' ')).join(', ') : 'None'}
                </DetailRow>
              </DetailSection>

              <DetailSection title="Scheduling & meta">
                <DetailRow label="Recurring" hint={FIELD_MEANING['Recurring']}>
                  {yesNo(flagBool(task.flagsJson, 'recurring'))}
                </DetailRow>
                <DetailRow label="Mandatory" hint={FIELD_MEANING['Mandatory']}>
                  {yesNo(flagBool(task.flagsJson, 'mandatory'))}
                </DetailRow>
                <DetailRow label="Senior only" hint={FIELD_MEANING['Senior only']}>
                  {yesNo(flagBool(task.flagsJson, 'seniorOnly'))}
                </DetailRow>
                <DetailRow label="Default horizon" hint={FIELD_MEANING['Default horizon']}>
                  {horizon ?? '—'}
                </DetailRow>
                <DetailRow label="Internal note" hint={FIELD_MEANING['Internal note']}>
                  {internalNote ?? '—'}
                </DetailRow>
              </DetailSection>

              <p className="text-[11px] italic text-muted-foreground">
                Read-only — these values are set by the system. Editable configuration is a later phase.
              </p>
            </>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TaskGroupSection({
  group,
  canManage,
  saving,
  onView,
  onEdit,
  onDelete,
  onToggleRequiresMultipleCarers,
}: {
  group: TaskCatalogueAdminGroup
  canManage: boolean
  saving: boolean
  onView: (task: TaskCatalogueAdminTask, categoryName: string) => void
  onEdit: (task: TaskCatalogueAdminTask, categoryId: string) => void
  onDelete: (task: TaskCatalogueAdminTask) => void
  onToggleRequiresMultipleCarers: (
    task: TaskCatalogueAdminTask,
    requiresMultipleCarers: boolean,
  ) => void
}) {
  return (
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">
        {GROUP_LABELS[group.code] ?? group.code.replace(/_/g, ' ')}
      </h4>
      <div className="space-y-3">
        {group.categories.map((category) => (
          <div key={category.id} className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border bg-muted/30 px-4 py-2.5">
              <p className="text-sm font-medium text-foreground">{category.name}</p>
            </div>
            <ul className="divide-y divide-border">
              {category.tasks.map((task) => (
                <li
                  key={task.id}
                  className={cn(
                    'flex items-start justify-between gap-3 px-4 py-3',
                    !task.isActive && 'bg-muted/20 opacity-70',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{task.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {!task.isActive ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          Inactive
                        </span>
                      ) : null}
                      {task.consentRequired ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          Consent
                        </span>
                      ) : null}
                      {task.requiresMultipleCarers ? (
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                          2+ carers
                        </span>
                      ) : null}
                      {task.competencyGated && task.competency ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {task.competency.replace(/_/g, ' ')}
                        </span>
                      ) : null}
                      {task.outOfScope ? (
                        <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-800 dark:bg-orange-950 dark:text-orange-200">
                          Out of scope
                        </span>
                      ) : null}
                      {task.supportLevelApplicable ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          Support level
                        </span>
                      ) : null}
                      {observationFeedLabels(task.flagsJson).map((label) => (
                        <span
                          key={label}
                          className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-medium text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                        >
                          Obs · {label}
                        </span>
                      ))}
                    </div>
                    <TaskLinkedDetails task={task} compact />
                    <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={task.requiresMultipleCarers}
                        disabled={!canManage || saving}
                        aria-label={`${task.name} requires more than 1 carer`}
                        onCheckedChange={(value) =>
                          onToggleRequiresMultipleCarers(task, value === true)
                        }
                      />
                      Requires more than 1 carer
                    </label>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`View ${task.name} details`}
                      onClick={() => onView(task, category.name)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canManage ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          disabled={saving}
                          aria-label={`Edit ${task.name}`}
                          onClick={() => onEdit(task, category.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          disabled={saving}
                          aria-label={`Remove ${task.name}`}
                          onClick={() => onDelete(task)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
