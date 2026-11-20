import * as React from 'react'
import { ClipboardCheck, ListTodo, Loader2 } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { useMyRoleTasks } from '@/features/role-tasks/hooks'
import { RoleTaskRow } from '@/features/role-tasks/components/RoleTaskRow'
import { MyTasksFilterBar } from '@/features/role-tasks/components/MyTasksFilterBar'
import { EMPTY_ROLE_TASK_FILTERS, applyRoleTaskFilters } from '@/features/role-tasks/role-task-filters'

export default function MyTasksPage() {
  const [tab, setTab] = React.useState<'open' | 'done'>('open')
  const router = useRouter()
  const roles = useAuthStore((s) => s.user?.backendRoles) ?? []
  const canManage = useAuthStore((s) => s.can('role_tasks.manage'))
  // Both lists load so each tab can show its count (19 Nov 2026).
  const openQuery = useMyRoleTasks('open')
  const doneQuery = useMyRoleTasks('done')
  const { data, isLoading, isError } = tab === 'open' ? openQuery : doneQuery
  const tasks = React.useMemo(() => data?.tasks ?? [], [data])
  const [filters, setFilters] = React.useState(EMPTY_ROLE_TASK_FILTERS)
  const shownTasks = React.useMemo(() => applyRoleTaskFilters(tasks, filters), [tasks, filters])
  const switchTab = (key: 'open' | 'done') => {
    setTab(key)
    setFilters(EMPTY_ROLE_TASK_FILTERS)
  }
  /** The server lists at most 100 done tasks. */
  const countLabel = (key: 'open' | 'done') => {
    const list = (key === 'open' ? openQuery : doneQuery).data?.tasks
    if (!list) return null
    return key === 'done' && list.length >= 100 ? '100+' : String(list.length)
  }
  const multipleRoles = roles.length > 1

  return (
    <div className="space-y-4">
      <PageHeader
        title="My tasks"
        description={`Work given to your role${roles.length ? ` (${roles.join(', ')})` : ''}. Anyone in the role can start or complete a task.`}
        icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'My tasks' }]}
      >
        {canManage ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            leftIcon={<ListTodo className="h-4 w-4" />}
            onClick={() => router.history.push('/role-tasks')}
          >
            Role tasks
          </Button>
        ) : null}
      </PageHeader>

      <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
        {(['open', 'done'] as const).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? 'default' : 'ghost'}
            className="h-8"
            onClick={() => switchTab(key)}
          >
            {key === 'open' ? 'To do' : 'Done'}
            {countLabel(key) !== null ? (
              <span
                className={cn(
                  'ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-5',
                  tab === key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
                data-testid={`my-tasks-count-${key}`}
              >
                {countLabel(key)}
              </span>
            ) : null}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">Could not load your tasks.</p>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {tab === 'open' ? 'Nothing to do for your role right now.' : 'No completed tasks yet.'}
        </div>
      ) : (
        <>
          <MyTasksFilterBar
            tab={tab}
            tasks={tasks}
            branches={openQuery.data?.branches ?? doneQuery.data?.branches}
            filters={filters}
            onChange={setFilters}
            shown={shownTasks.length}
          />
          {shownTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No tasks match these filters.
            </div>
          ) : (
            // One list, no group headings (19 Nov 2026): the server sorts To do by due date, so overdue
            // tasks come first and carry a red "Overdue" tag; Done is newest first.
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              {shownTasks.map((t) => (
                <RoleTaskRow key={t.id} task={t} showRole={multipleRoles} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
