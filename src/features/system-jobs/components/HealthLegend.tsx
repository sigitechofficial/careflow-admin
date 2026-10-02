import { HEALTH_META, HEALTH_ORDER } from '@/features/system-jobs/lib/system-jobs-format'
import { JobHealthBadge, TriggerBadge } from '@/features/system-jobs/components/SystemJobsBadges'

export function HealthLegend() {
  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-labelledby="system-jobs-legend-title"
      data-testid="system-jobs-legend"
    >
      <div className="border-b border-border px-4 py-3">
        <h2 id="system-jobs-legend-title" className="text-sm font-semibold text-foreground">
          What the health statuses mean
        </h2>
      </div>
      <div className="grid gap-6 p-4 lg:grid-cols-2">
        <dl className="space-y-3">
          {HEALTH_ORDER.map(h => (
            <div key={h} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
              <dt className="w-28 shrink-0">
                <JobHealthBadge health={h} withTooltip={false} />
              </dt>
              <dd className="text-sm text-muted-foreground">{HEALTH_META[h].explanation}</dd>
            </div>
          ))}
        </dl>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Who starts the jobs</p>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
            <div className="w-36 shrink-0">
              <TriggerBadge trigger="function" withTooltip={false} />
            </div>
            <p>Azure Functions timers call the API every few minutes (alerts, reminders, surveys) or hourly (pricing sync, carer payouts).</p>
          </div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
            <div className="w-36 shrink-0">
              <TriggerBadge trigger="container-job" withTooltip={false} />
            </div>
            <p>Azure Container Apps Jobs run the heavier nightly work (rolling rota, plan end dates, learning, care plan reviews) in their own container.</p>
          </div>
          <p>
            Each job runs once per period even if it is triggered twice. In fallback mode the API&apos;s own scheduler
            runs everything instead. <span className="font-medium text-foreground">Run now</span> starts an extra manual
            run and is recorded in the history with your name.
          </p>
        </div>
      </div>
    </section>
  )
}
