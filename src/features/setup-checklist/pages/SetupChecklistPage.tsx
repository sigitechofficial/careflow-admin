import * as React from 'react'
import { useRouter } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ListChecks, RefreshCw, XCircle } from 'lucide-react'
import { PageHeader } from '@/shared/ui/page-elements'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/misc'
import { cn } from '@/shared/lib/utils'
import { useSetupChecklist } from '@/features/setup-checklist/hooks'
import type { ChecklistItem, ChecklistStatus } from '@/features/setup-checklist/types'

const STATUS_ICON: Record<ChecklistStatus, React.ReactNode> = {
  complete: <CheckCircle2 className="h-5 w-5 text-success" aria-label="Done" />,
  partial: <AlertTriangle className="h-5 w-5 text-warning" aria-label="Partly done" />,
  missing: <XCircle className="h-5 w-5 text-destructive" aria-label="Missing" />,
}

function ItemRow({ item, go }: { item: ChecklistItem; go: (href: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const missingCount =
    item.total != null && item.count != null ? item.total - item.count : item.problems ? (item.value ?? 0) : 0
  const figure =
    item.total != null && item.count != null
      ? `${item.count} of ${item.total}`
      : item.value != null
        ? item.problems
          ? item.value === 0
            ? 'None'
            : `${item.value} to fix`
          : String(item.value)
        : item.status === 'complete'
          ? 'Done'
          : 'Not set up'

  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <span className="mt-0.5 shrink-0">{STATUS_ICON[item.status]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-sm font-medium text-foreground">{item.label}</p>
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                item.status === 'complete' && 'text-success',
                item.status === 'partial' && 'text-warning',
                item.status === 'missing' && 'text-destructive',
              )}
            >
              {figure}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
          {item.missing && item.missing.length > 0 && item.status !== 'complete' ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {open ? 'Hide' : 'Show'} {item.problems ? 'list' : 'who is missing'} ({missingCount})
            </button>
          ) : null}
          {open && item.missing ? (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {item.missing.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => go(m.link)}
                    className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-foreground hover:bg-muted"
                  >
                    {m.name}
                  </button>
                </li>
              ))}
              {missingCount > item.missing.length ? (
                <li className="self-center text-xs text-muted-foreground">
                  and {missingCount - item.missing.length} more
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        {item.status !== 'complete' ? (
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => go(item.link)}>
            Fix
          </Button>
        ) : null}
      </div>
    </li>
  )
}

export default function SetupChecklistPage() {
  const router = useRouter()
  const { data, isLoading, isError, refetch, isFetching } = useSetupChecklist()
  const go = (href: string) => router.history.push(href)
  const summary = data?.summary
  const percent = summary && summary.total > 0 ? Math.round((summary.complete / summary.total) * 100) : 0

  return (
    <div className="space-y-4">
      <PageHeader
        title="Checklist"
        icon={<ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />}
        breadcrumb={[{ label: 'Home', href: '/' }, { label: 'Checklist' }]}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="min-w-[220px] flex-1">
          <p className="text-sm font-medium text-foreground">
            {summary ? `${summary.complete} of ${summary.total} done` : 'Checking your setup…'}
          </p>
          <Progress value={percent} className="mt-2 h-2" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Everything needed for service users, billing, payroll, invoicing, scheduling, incidents, surveys, office
            salaries, staff compliance, the carer app, reviews and user access. Missing items show a Fix button.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading checklist…</p>
      ) : isError || !data ? (
        <p className="text-sm text-destructive">Could not load the checklist.</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.sections.map((section) => {
            const done = section.items.filter((i) => i.status === 'complete').length
            return (
              <section key={section.key} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      done === section.items.length
                        ? 'bg-success/15 text-success'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {done}/{section.items.length} done
                  </span>
                </header>
                <ul className="divide-y divide-border">
                  {section.items.map((item) => (
                    <ItemRow key={item.key} item={item} go={go} />
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
