import * as React from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { formatOrganisationDateTime } from '@/shared/lib/organisation-display-format.store'
import { Input } from '@/shared/ui/input'
import { ContentSectionHeader } from '@/shared/ui/content-section'
import { useLearningAssignmentStatusCounts, useLearningAssignments } from '@/features/learning/hooks/useLearning'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { LEARNING_DELIVERY_METHOD_OPTIONS } from '@/features/learning/types/learning.types'
import type { LearningAssignmentResult, LearningAssignmentStatusGroup } from '@/features/learning/types/learning.types'
import { useGlobalLocationScope } from '@/features/locations/hooks/useGlobalLocationScope'
import { LearningStatusBadge } from '@/features/learning/components/LearningStatusBadge'
import { AssignmentWizardDialog } from '@/features/learning/components/AssignmentWizardDialog'
import { AssignmentRecordSheet, assignmentStatusForBadge } from '@/features/learning/components/AssignmentRecordSheet'
import { useAuthStore } from '@/features/auth/store'

type StatusTab = 'ALL' | 'OPEN' | 'COMPLETED' | 'NOT_COMPLETED' | 'CANCELLED'
type OpenFilter = 'ALL' | 'ASSIGNED' | 'IN_PROGRESS' | 'OVERDUE'

/** 5 status tabs (user, 16 Nov 2026). Groups are defined in the API (ASSIGNMENT_STATUS_GROUPS). */
const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NOT_COMPLETED', label: 'Not completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

/** Quick filters inside Open: overdue courses can still be finished, so they stay open. */
const OPEN_FILTERS: Array<{ value: OpenFilter; label: string }> = [
  { value: 'ALL', label: 'All open' },
  { value: 'ASSIGNED', label: 'Not started' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'OVERDUE', label: 'Overdue' },
]

/** "3 days late", "5 hours late" (16 Nov 2026). */
/** Pass / fail with how it was decided (16 Nov 2026). */
function ResultCell({ result }: { result?: LearningAssignmentResult | null }) {
  if (!result) return <span className="text-muted-foreground">—</span>
  const how =
    result.by === 'MANAGER'
      ? 'Manager outcome'
      : result.by === 'MANAGER_QUIZ'
        ? `Manager + quiz${result.score != null ? ` ${result.score}%` : ''}`
      : result.by === 'QUIZ'
        ? `Final quiz${result.score != null ? ` ${result.score}%` : ''}`
        : result.result === 'PASSED'
          ? 'All lessons done'
          : null
  const tone =
    result.result === 'PASSED'
      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
      : result.result === 'NOT_PASSED'
        ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200'
        : 'bg-muted text-muted-foreground'
  const label = result.result === 'PASSED' ? 'Passed' : result.result === 'NOT_PASSED' ? 'Not passed' : 'Expired'
  return (
    <div>
      <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
      {how ? <div className="mt-0.5 text-[11px] text-muted-foreground">{how}</div> : null}
    </div>
  )
}

function lateBy(dueAt: string, completedAt: string): string {
  const ms = new Date(completedAt).getTime() - new Date(dueAt).getTime()
  if (ms <= 0) return 'Late'
  const hours = ms / 3_600_000
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))} min late`
  if (hours < 24) return `${Math.round(hours)} ${Math.round(hours) === 1 ? 'hour' : 'hours'} late`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} late`
}

export function AssignmentsPanel() {
  const canManage = useAuthStore(s => s.can('learning.assignments.manage'))
  const { locationId } = useGlobalLocationScope()
  const [page, setPage] = React.useState(1)
  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<StatusTab>('ALL')
  const showResult = status === 'COMPLETED' || status === 'NOT_COMPLETED'
  const [openFilter, setOpenFilter] = React.useState<OpenFilter>('ALL')
  const [wizardOpen, setWizardOpen] = React.useState(false)
  const [openId, setOpenId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setPage(1)
  }, [locationId])

  const query = useLearningAssignments({
    page,
    limit: 20,
    search: search || undefined,
    locationId: locationId ?? undefined,
    statusGroup:
      status === 'ALL' ? undefined : status === 'OPEN' && openFilter !== 'ALL' ? openFilter : status,
  })
  const countsQuery = useLearningAssignmentStatusCounts({
    search: search || undefined,
    locationId: locationId ?? undefined,
  })
  const counts = countsQuery.data
  const rows = query.data?.rows ?? []
  const meta = query.data?.meta

  return (
    <div className="space-y-4" data-testid="learning-assignments-panel">
      <ContentSectionHeader
        title="Assignments"
        description="Track course assignments across the organisation. Use Assign training for individuals, roles, locations, or work areas."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <UserPlus className="mr-1 h-4 w-4" />
              Assign training
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={status}
        onValueChange={v => {
          setStatus(v as StatusTab)
          setOpenFilter('ALL')
          setPage(1)
        }}
      >
        <div className="overflow-x-auto">
          <TabsList variant="underline" className="h-auto min-w-max justify-start" aria-label="Assignment status">
            {STATUS_TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value} variant="underline" data-testid={`assignments-tab-${t.value}`}>
                {t.label}
                <span className="ml-1.5 text-xs text-muted-foreground">{counts ? counts[t.value] : ''}</span>
                {t.value === 'OPEN' && counts && counts.OVERDUE > 0 ? (
                  <span
                    className="ml-1.5 rounded-full bg-red-100 px-1.5 text-[11px] font-medium text-red-700 dark:bg-red-950/50 dark:text-red-200"
                    title="Overdue"
                  >
                    {counts.OVERDUE} overdue
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {status === 'OPEN' ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter open assignments">
          {OPEN_FILTERS.map(f => {
            const n = counts ? (f.value === 'ALL' ? counts.OPEN : counts[f.value]) : undefined
            const active = openFilter === f.value
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setOpenFilter(f.value)
                  setPage(1)
                }}
                aria-pressed={active}
                className={
                  active
                    ? 'rounded-full border border-primary bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
                    : f.value === 'OVERDUE' && n
                      ? 'rounded-full border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200'
                      : 'rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted'
                }
              >
                {f.label}
                {n !== undefined ? ` · ${n}` : ''}
              </button>
            )
          })}
        </div>
      ) : null}

      <Input
        placeholder="Search by carer or course…"
        value={search}
        onChange={e => {
          setSearch(e.target.value)
          setPage(1)
        }}
        className="max-w-sm"
      />

      {query.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {status === 'ALL' ? 'No assignments found.' : `No ${STATUS_TABS.find(t => t.value === status)?.label.toLowerCase()} assignments.`}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Completed</th>
                {showResult ? <th className="px-3 py-2">Result</th> : null}
                <th className="px-3 py-2">Assigned</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-border hover:bg-muted/40"
                  onClick={() => setOpenId(row.id)}
                >
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{row.employeeName || '—'}</div>
                    {row.employeeId ? (
                      <div className="font-mono text-[11px] text-muted-foreground">{row.employeeId.slice(0, 8)}…</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{row.courseTitle || '—'}</div>
                    {row.courseCode ? (
                      <div className="text-[11px] text-muted-foreground">{row.courseCode}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {LEARNING_DELIVERY_METHOD_OPTIONS.find(o => o.value === row.deliveryMethod)?.label ?? '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <LearningStatusBadge status={assignmentStatusForBadge(row.status)} />
                      {row.completedLate ? (
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                          Late
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.dueAt ? new Date(row.dueAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {row.completedAt ? (
                      <>
                        <div className="text-foreground">{formatOrganisationDateTime(row.completedAt)}</div>
                        {row.completedLate && row.dueAt ? (
                          <div className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                            {lateBy(row.dueAt, row.completedAt)}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {showResult ? (
                    <td className="px-3 py-2">
                      <ResultCell result={row.result} />
                    </td>
                  ) : null}
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(row.assignedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {meta.page} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={!meta.hasNextPage} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <AssignmentWizardDialog open={wizardOpen} onOpenChange={setWizardOpen} />
      <AssignmentRecordSheet assignmentId={openId} onOpenChange={open => !open && setOpenId(null)} />
    </div>
  )
}
