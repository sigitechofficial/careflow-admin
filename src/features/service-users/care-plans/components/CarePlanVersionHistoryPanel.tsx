import * as React from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { cn, formatDate } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { fetchCarePlanVersions } from '@/features/service-users/care-plans/api'
import { serviceUserKeys } from '@/features/service-users/keys'
import type { CarePlanPublishedVersionSummary } from '@/features/service-users/care-plans/types'

type Props = {
  serviceUserId: string
  formId: string
  enabled?: boolean
  currentVersionId?: string | null
  onViewVersion?: (version: CarePlanPublishedVersionSummary) => void
}

export function CarePlanVersionHistoryPanel({
  serviceUserId,
  formId,
  enabled = true,
  currentVersionId,
  onViewVersion,
}: Props) {
  const [open, setOpen] = React.useState(false)

  const versionsQuery = useQuery({
    queryKey: [...serviceUserKeys.carePlan(serviceUserId), 'versions', formId] as const,
    queryFn: ({ signal }) => fetchCarePlanVersions(serviceUserId, formId, { signal }),
    enabled: enabled && Boolean(serviceUserId) && Boolean(formId) && open,
    staleTime: 30_000,
  })

  const versions = versionsQuery.data ?? []

  if (!enabled) return null

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm" data-testid="care-plan-version-history">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-foreground">Version history</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="border-t border-border px-4 py-3">
          {versionsQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No published versions yet.</p>
          ) : (
            <ul className="space-y-2">
              {versions.map(version => (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      v{version.versionNumber}
                      {version.isCurrent || version.id === currentVersionId ? (
                        <span className="ml-2 text-xs font-normal text-[#0d9488]">Current</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(version.publishedAt)}
                      {version.summary ? ` · ${version.summary}` : ''}
                    </p>
                  </div>
                  {onViewVersion ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onViewVersion(version)}
                    >
                      View
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
