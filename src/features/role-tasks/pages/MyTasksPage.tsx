import * as React from 'react'
import { ClipboardCheck, ListTodo, Loader2 } from 'lucide-react'
import { useRouter } from '@tanstack/react-router'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { useAuthStore } from '@/features/auth/store'
import { useMyRoleTasks } from '@/features/role-tasks/hooks'
import { RoleTaskRow } from '@/features/role-tasks/components/RoleTaskRow'
import type { RoleTask } from '@/features/role-tasks/types'

const GROUPS: Array<{ key: NonNullable<RoleTask['dueState']>; title: string }> = [
  { key: 'overdue', title: 'Overdue' },
  { key: 'today', title: 'Due today' },
  { key: 'upcoming', title: 'Coming up' },
]

export default function MyTasksPage() {
  const [tab, setTab] = React.useState<'open' | 'done'>('open')
  const router = useRouter()
  const roles = useAuthStore((s) => s.user?.backendRoles) ?? []
  const canManage = useAuthStore((s) => s.can('role_tasks.manage'))
  const { data, isLoading, isError } = useMyRoleTasks(tab)
  const tasks = data?.tasks ?? []
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
            onClick={() => setTab(key)}
          >
            {key === 'open' ? 'To do' : 'Done'}
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
      ) : tab === 'done' ? (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {tasks.map((t) => (
            <RoleTaskRow key={t.id} task={t} showRole={multipleRoles} />
          ))}
        </ul>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((group) => {
            const items = tasks.filter((t) => t.dueState === group.key)
            if (!items.length) return null
            return (
              <section key={group.key} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <h2
                    className={cn(
                      'text-sm font-semibold',
                      group.key === 'overdue' ? 'text-destructive' : 'text-foreground',
                    )}
                  >
                    {group.title}
                  </h2>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {items.length}
                  </span>
                </header>
                <ul className="divide-y divide-border">
                  {items.map((t) => (
                    <RoleTaskRow key={t.id} task={t} showRole={multipleRoles} />
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
