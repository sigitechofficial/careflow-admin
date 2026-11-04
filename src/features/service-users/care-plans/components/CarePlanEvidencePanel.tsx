import * as React from 'react'
import { ChevronDown, ExternalLink } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import type { CarePlanComposeGap, CarePlanComposeEvidence, CarePlanComposeDelta } from '@/features/service-users/care-plans/types'
import { carePlanFieldLabel } from '@/features/service-users/care-plan/care-plan-first-person-labels'

const SOURCE_LABEL: Record<CarePlanComposeEvidence['source'], string> = {
  ia: 'IA',
  about_me: 'About Me',
  profile: 'Profile',
  contacts: 'Contacts',
  allergies: 'Allergies',
  emar: 'eMAR',
  medication_pack: 'Pack',
}

export function CarePlanEvidencePanel({
  evidence,
  gaps,
  fieldSources,
  deltas = [],
  lastPublishedVersionNumber,
  loading,
  onRefresh,
  refreshing,
}: {
  evidence: CarePlanComposeEvidence[]
  gaps: CarePlanComposeGap[]
  fieldSources: Record<string, string>
  deltas?: CarePlanComposeDelta[]
  lastPublishedVersionNumber?: number | null
  loading?: boolean
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const [open, setOpen] = React.useState(true)

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Loading sources…
      </div>
    )
  }

  if (evidence.length === 0 && gaps.length === 0 && deltas.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm" data-testid="care-plan-evidence-panel">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">Sources & gaps</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="space-y-4 border-t border-border px-4 py-3">
          {onRefresh ? (
            <div className="flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh from sources'}
              </Button>
            </div>
          ) : null}

          {evidence.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence</p>
              <ul className="space-y-2">
                {evidence.map(item => (
                  <li key={item.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          <span className="mr-2 text-xs text-[#0d9488]">{SOURCE_LABEL[item.source]}</span>
                          {item.label}
                        </p>
                        <p className="mt-0.5 text-muted-foreground">{item.value}</p>
                      </div>
                      {item.route ? (
                        <a
                          href={item.route}
                          className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Open
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {gaps.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Gaps ({gaps.length})
              </p>
              <ul className="space-y-2">
                {gaps.map(gap => (
                  <li
                    key={gap.fieldKey}
                    className={cn(
                      'rounded-md border px-3 py-2 text-sm',
                      gap.severity === 'blocking'
                        ? 'border-destructive/40 bg-destructive/5'
                        : 'border-amber-500/40 bg-amber-50 dark:bg-amber-950/20',
                    )}
                  >
                    <p className="font-medium text-foreground">{carePlanFieldLabel(gap.label)}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {gap.fixes.map(fix => (
                        <a
                          key={fix.route}
                          href={fix.route}
                          className="text-xs text-primary hover:underline"
                        >
                          {fix.label}
                        </a>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {Object.keys(fieldSources).length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {Object.keys(fieldSources).length} field(s) prefilled from sources.
            </p>
          ) : null}

          {deltas.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Changes since published
                {lastPublishedVersionNumber ? ` (v${lastPublishedVersionNumber})` : ''} ({deltas.length})
              </p>
              <ul className="space-y-2">
                {deltas.slice(0, 8).map(delta => (
                  <li key={delta.fieldKey} className="rounded-md border border-amber-500/30 bg-amber-50/60 px-3 py-2 text-sm dark:bg-amber-950/20">
                    <p className="font-medium text-foreground">{carePlanFieldLabel(delta.label)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Sources now suggest: {String(delta.composedValue ?? '—')}
                    </p>
                  </li>
                ))}
                {deltas.length > 8 ? (
                  <li className="text-xs text-muted-foreground">+{deltas.length - 8} more field(s) changed</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
