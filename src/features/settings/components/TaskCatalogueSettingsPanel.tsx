import * as React from 'react'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
  return task.name.toLowerCase().includes(query)
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

function TaskGroupSection({
  group,
  canManage,
  saving,
  onEdit,
  onDelete,
  onToggleRequiresMultipleCarers,
}: {
  group: TaskCatalogueAdminGroup
  canManage: boolean
  saving: boolean
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
                    </div>
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
                  {canManage ? (
                    <div className="flex shrink-0 gap-1">
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
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
