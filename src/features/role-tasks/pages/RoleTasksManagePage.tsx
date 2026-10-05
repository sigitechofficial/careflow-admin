import * as React from 'react'
import { ListTodo, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { operationalTodayIso } from '@/shared/lib/operational-day.util'
import { useOrganisationDisplayFormat } from '@/shared/context/organisation-display-format.context'
import {
  useAllRoleTasks,
  useDeleteRoleTaskTemplate,
  useRoleTaskOptions,
  useRoleTaskTemplates,
  useSaveRoleTaskTemplate,
} from '@/features/role-tasks/hooks'
import { RoleTaskRow } from '@/features/role-tasks/components/RoleTaskRow'
import {
  RECURRENCE_LABEL,
  ROLE_TASK_PAGES,
  WEEKDAYS,
  rolePageLabel,
  repeatLabel,
} from '@/features/role-tasks/role-task-format'
import type {
  RoleTaskListStatus,
  RoleTaskRecurrence,
  RoleTaskTemplate,
  RoleTaskTemplateInput,
} from '@/features/role-tasks/types'

const fieldClass =
  'h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

type FormState = {
  title: string
  description: string
  roleId: string
  locationId: string
  link: string
  recurrence: RoleTaskRecurrence
  startDate: string
  weekday: string
  dayOfMonth: string
  isActive: boolean
}

function formFrom(t: RoleTaskTemplate | null): FormState {
  const today = operationalTodayIso()
  return {
    title: t?.title ?? '',
    description: t?.description ?? '',
    roleId: t?.role.id ?? '',
    locationId: t?.location?.id ?? '',
    link: t?.link ?? '',
    recurrence: t?.recurrence ?? 'NONE',
    startDate: t?.startDate ?? today,
    weekday: String(t?.weekday ?? 1),
    dayOfMonth: String(t?.dayOfMonth ?? Number(today.slice(8, 10))),
    isActive: t?.isActive ?? true,
  }
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function TemplateDialog({
  open,
  template,
  onClose,
}: {
  open: boolean
  template: RoleTaskTemplate | null
  onClose: () => void
}) {
  const options = useRoleTaskOptions()
  const save = useSaveRoleTaskTemplate()
  const [form, setForm] = React.useState<FormState>(() => formFrom(template))
  React.useEffect(() => {
    if (open) setForm(formFrom(template))
  }, [open, template])
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const restricted = options.data?.branchRestricted ?? false
  const customLink = form.link && !ROLE_TASK_PAGES.some((p) => p.path === form.link)

  const submit = async () => {
    const input: RoleTaskTemplateInput = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      roleId: form.roleId,
      locationId: form.locationId || null,
      link: form.link || null,
      recurrence: form.recurrence,
      startDate: form.startDate,
      weekday: form.recurrence === 'WEEKLY' ? Number(form.weekday) : null,
      dayOfMonth: form.recurrence === 'MONTHLY' ? Number(form.dayOfMonth) : null,
      ...(template ? { isActive: form.isActive } : {}),
    }
    try {
      await save.mutateAsync({ id: template?.id, input })
      toastSuccess(template ? 'Task updated' : 'Task created')
      onClose()
    } catch (err) {
      toastApiError(err, 'Could not save the task.')
    }
  }

  const canSave = form.title.trim() && form.roleId && form.startDate && (!restricted || form.locationId)

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? undefined : onClose())}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{template ? 'Edit role task' : 'New role task'}</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Field label="Task">
            <input
              className={fieldClass}
              value={form.title}
              maxLength={200}
              placeholder="e.g. Calculate this month's salaries"
              onChange={(e) => set('title', e.target.value)}
            />
          </Field>
          <Field label="Details (optional)">
            <textarea
              className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              maxLength={2000}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Role" hint="Anyone with this role can start or complete it.">
              <select className={fieldClass} value={form.roleId} onChange={(e) => set('roleId', e.target.value)}>
                <option value="">Choose a role…</option>
                {(options.data?.roles ?? []).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Branch">
              <select
                className={fieldClass}
                value={form.locationId}
                onChange={(e) => set('locationId', e.target.value)}
              >
                <option value="">{restricted ? 'Choose a branch…' : 'All branches'}</option>
                {(options.data?.locations ?? []).map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Repeats">
              <select
                className={fieldClass}
                value={form.recurrence}
                onChange={(e) => set('recurrence', e.target.value as RoleTaskRecurrence)}
              >
                {(Object.keys(RECURRENCE_LABEL) as RoleTaskRecurrence[]).map((r) => (
                  <option key={r} value={r}>
                    {RECURRENCE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={form.recurrence === 'NONE' ? 'Due date' : 'Starts from'}>
              <input
                type="date"
                className={fieldClass}
                value={form.startDate}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </Field>
          </div>
          {form.recurrence === 'WEEKLY' ? (
            <Field label="Day of the week">
              <select className={fieldClass} value={form.weekday} onChange={(e) => set('weekday', e.target.value)}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {form.recurrence === 'MONTHLY' ? (
            <Field label="Day of the month" hint="Short months use their last day.">
              <select
                className={fieldClass}
                value={form.dayOfMonth}
                onChange={(e) => set('dayOfMonth', e.target.value)}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Field label="Page to open (optional)" hint="Shown as an 'Open page' button on the task.">
            <select className={fieldClass} value={form.link} onChange={(e) => set('link', e.target.value)}>
              <option value="">No page</option>
              {customLink ? <option value={form.link}>{form.link}</option> : null}
              {ROLE_TASK_PAGES.map((p) => (
                <option key={p.path} value={p.path}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          {template ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
              />
              Active (new due dates are created)
            </label>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave || save.isPending} onClick={() => void submit()}>
            {save.isPending ? 'Saving…' : template ? 'Save' : 'Create task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function RoleTasksManagePage() {
  const { formatDate } = useOrganisationDisplayFormat()
  const [tab, setTab] = React.useState<'definitions' | 'tasks'>('definitions')
  const [status, setStatus] = React.useState<RoleTaskListStatus>('open')
  const [roleFilter, setRoleFilter] = React.useState('')
  const [editing, setEditing] = React.useState<RoleTaskTemplate | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [deleting, setDeleting] = React.useState<RoleTaskTemplate | null>(null)

  const templates = useRoleTaskTemplates()
  const options = useRoleTaskOptions()
  const all = useAllRoleTasks(status, roleFilter || undefined, tab === 'tasks')
  const remove = useDeleteRoleTaskTemplate()

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      toastSuccess('Task deleted')
      setDeleting(null)
    } catch (err) {
      toastApiError(err, 'Could not delete the task.')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Role tasks"
        description="Give work to a role — one-off or repeating. Everyone in the role sees it under My tasks."
        icon={<ListTodo className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'My tasks', href: '/my-tasks' }, { label: 'Role tasks' }]}
      >
        <Button type="button" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
          New task
        </Button>
      </PageHeader>

      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
        {(
          [
            ['definitions', 'Tasks by role'],
            ['tasks', 'Progress'],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? 'default' : 'ghost'}
            className="h-8"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === 'definitions' ? (
        templates.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : templates.isError ? (
          <p className="text-sm text-destructive">Could not load role tasks.</p>
        ) : (templates.data ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            No role tasks yet. Use “New task” to give work to a role.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Task</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Branch</th>
                  <th className="px-4 py-2">Repeats</th>
                  <th className="px-4 py-2">Next due</th>
                  <th className="px-4 py-2">Open</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(templates.data ?? []).map((t) => (
                  <tr key={t.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{t.title}</p>
                      {t.link ? (
                        <p className="text-xs text-muted-foreground">Opens: {rolePageLabel(t.link)}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5">{t.role.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{t.location?.name ?? 'All branches'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {repeatLabel(t, formatDate)}
                      {!t.isActive ? (
                        <Badge variant="outline" className="ml-2">
                          Paused
                        </Badge>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-muted-foreground">
                      {t.nextDue ? formatDate(t.nextDue) : '—'}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{t.openCount}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        leftIcon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => {
                          setEditing(t)
                          setDialogOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => setDeleting(t)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={`${fieldClass} w-auto min-w-[12rem]`}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Role"
            >
              <option value="">All roles</option>
              {(options.data?.roles ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              className={`${fieldClass} w-auto`}
              value={status}
              onChange={(e) => setStatus(e.target.value as RoleTaskListStatus)}
              aria-label="Status"
            >
              <option value="open">To do</option>
              <option value="done">Done</option>
              <option value="all">All</option>
            </select>
          </div>
          {all.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : all.isError ? (
            <p className="text-sm text-destructive">Could not load tasks.</p>
          ) : (all.data?.tasks ?? []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No tasks here.
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {(all.data?.tasks ?? []).map((t) => (
                <RoleTaskRow key={t.id} task={t} />
              ))}
            </ul>
          )}
        </div>
      )}

      <TemplateDialog open={dialogOpen} template={editing} onClose={() => setDialogOpen(false)} />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => (o ? undefined : setDeleting(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.title}” will stop for {deleting?.role.name}. Open copies are cancelled; completed ones stay in
              the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
