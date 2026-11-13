import * as React from 'react'
import { Briefcase, ChevronRight, CircleCheck, CircleSlash, ExternalLink, Globe, Link2, PauseCircle, Plus } from 'lucide-react'
import { toastError, toastSuccess } from '@/shared/lib/toast'
import { useAuthStore } from '@/features/auth/store'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { STAT_CARD_TONES, type StatCardTone } from '@/shared/ui/card'
import { VacancyListTable } from '@/features/hr/recruitment/components/VacancyListTable'
import { VacancyFormDialog } from '@/features/hr/recruitment/components/VacancyFormDialog'
import { useVacancies } from '@/features/hr/recruitment/hooks/useRecruitment'
import type { VacancyRow, VacancyStatus } from '@/features/hr/recruitment/api/recruitment.api'
import { cn } from '@/shared/lib/utils'

async function copyCareersLink() {
  const url = `${window.location.origin}/careers`
  try {
    await navigator.clipboard.writeText(url)
    toastSuccess('Careers page link copied', url)
  } catch {
    toastError('Could not copy the link', url)
  }
}

/** Number of vacancies with a status (one small request each). */
function useVacancyCount(status?: VacancyStatus) {
  const query = useVacancies({ page: 1, limit: 1, status })
  return query.data?.meta.total
}

/** Count card; clicking it filters the list below. */
function StatusTile({
  label,
  hint,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string
  hint: string
  value: number | undefined
  icon: React.ReactNode
  tone: StatCardTone
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group rounded-xl border bg-card p-4 text-left shadow-sm transition-colors duration-150',
        'hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
            STAT_CARD_TONES[tone],
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold tabular-nums tracking-tight">{value ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
        <ChevronRight
          className={cn(
            'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-opacity',
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          aria-hidden
        />
      </div>
    </button>
  )
}

export default function VacanciesPage() {
  const canCreate = useAuthStore.getState().can('hr.vacancies.create')
  const canUpdate = useAuthStore.getState().can('hr.vacancies.update')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<VacancyRow | null>(null)
  const [status, setStatus] = React.useState<VacancyStatus | 'ALL'>('ALL')

  const counts = {
    ALL: useVacancyCount(),
    OPEN: useVacancyCount('OPEN'),
    PAUSED: useVacancyCount('PAUSED'),
    CLOSED: useVacancyCount('CLOSED'),
  }
  const careersUrl = `${window.location.origin}/careers`
  const toggle = (next: VacancyStatus | 'ALL') => setStatus(prev => (prev === next ? 'ALL' : next))

  return (
    <div className="flex flex-col gap-5" data-testid="hr-vacancies-page">
      <PageHeader
        title="Vacancies"
        description="The jobs you are hiring for. Open vacancies appear on your careers page, where people apply online."
        icon={
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <Briefcase className="h-4 w-4" aria-hidden />
          </span>
        }
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'HR', href: '/hr/employees' },
          { label: 'Recruitment', href: '/hr/recruitment' },
          { label: 'Vacancies' },
        ]}
        actions={
          canCreate
            ? [{ label: 'New vacancy', icon: <Plus className="h-4 w-4" />, onClick: () => setCreateOpen(true) }]
            : undefined
        }
      />

      <section aria-label="Vacancies by status" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatusTile
          label="All vacancies"
          hint="Every job on record"
          value={counts.ALL}
          icon={<Briefcase className="h-5 w-5" />}
          tone="violet"
          active={status === 'ALL'}
          onClick={() => setStatus('ALL')}
        />
        <StatusTile
          label="Open"
          hint="On the careers page, taking applications"
          value={counts.OPEN}
          icon={<CircleCheck className="h-5 w-5" />}
          tone="emerald"
          active={status === 'OPEN'}
          onClick={() => toggle('OPEN')}
        />
        <StatusTile
          label="Paused"
          hint="Hidden for now, can be reopened"
          value={counts.PAUSED}
          icon={<PauseCircle className="h-5 w-5" />}
          tone="amber"
          active={status === 'PAUSED'}
          onClick={() => toggle('PAUSED')}
        />
        <StatusTile
          label="Closed"
          hint="No longer hiring"
          value={counts.CLOSED}
          icon={<CircleSlash className="h-5 w-5" />}
          tone="rose"
          active={status === 'CLOSED'}
          onClick={() => toggle('CLOSED')}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center md:px-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
          <Globe className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Your careers page</p>
          <p className="text-xs text-muted-foreground">
            People apply online, no login needed. Share this link for all jobs, or a job's own link from the list.
            Applications arrive as candidates at step 1.
          </p>
          <p className="mt-1.5 inline-block max-w-full truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">
            {careersUrl}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void copyCareersLink()}>
            <Link2 className="h-4 w-4" /> Copy link
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => window.open('/careers', '_blank', 'noopener')}>
            <ExternalLink className="h-4 w-4" /> Open
          </Button>
        </div>
      </section>

      <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5">
        <VacancyListTable
          status={status}
          onStatusChange={setStatus}
          onEdit={canUpdate ? setEditing : undefined}
          onCreateClick={canCreate ? () => setCreateOpen(true) : undefined}
        />
      </section>

      {canCreate ? <VacancyFormDialog open={createOpen} onOpenChange={setCreateOpen} /> : null}
      {canUpdate ? (
        <VacancyFormDialog open={!!editing} vacancy={editing} onOpenChange={o => !o && setEditing(null)} />
      ) : null}
    </div>
  )
}
