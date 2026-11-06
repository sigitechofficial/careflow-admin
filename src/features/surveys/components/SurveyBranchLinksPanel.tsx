import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Link2, RefreshCw, X } from 'lucide-react'
import { apiJson, type ApiEnvelope } from '@/shared/api/api-client'
import { Button } from '@/shared/ui/button'
import { toastApiError, toastSuccess } from '@/shared/lib/toast'
import { buildSurveyShareUrl } from '@/features/surveys/api/surveys.api'

type ShareLinks = {
  main: { token: string }
  branches: Array<{ id: string; token: string; locationId: string | null; locationName: string | null; createdAt: string }>
  availableBranches: Array<{ id: string; name: string }>
}

const linksKey = (surveyId: string) => ['surveys', 'share-links', surveyId] as const

/**
 * Public survey: a link per branch, so answers through a branch's poster or web page carry that
 * branch. A link that has been shared too widely can be turned off or replaced (New link).
 * API: survey-share-links.service.ts (audited).
 */
export function SurveyBranchLinksPanel({ surveyId }: { surveyId: string }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: linksKey(surveyId),
    queryFn: async () => (await apiJson<ApiEnvelope<ShareLinks>>(`/surveys/${surveyId}/share-links`, { method: 'GET' })).data as ShareLinks,
  })
  const refresh = () => void qc.invalidateQueries({ queryKey: linksKey(surveyId) })
  const make = useMutation({
    mutationFn: async (locationId: string) => apiJson(`/surveys/${surveyId}/share-links`, { method: 'POST', body: JSON.stringify({ locationId }) }),
    onSuccess: refresh,
  })
  const off = useMutation({
    mutationFn: async ({ id, replace }: { id: string; replace: boolean }) =>
      apiJson(`/surveys/${surveyId}/share-links/${id}${replace ? '?replace=true' : ''}`, { method: 'DELETE' }),
    onSuccess: refresh,
  })
  const [branch, setBranch] = React.useState('')
  const headingId = React.useId()
  if (!data) return null

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildSurveyShareUrl(token))
      toastSuccess('Link copied')
    } catch {
      toastApiError(new Error('copy'), 'Could not copy the link')
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-border bg-card px-4 py-3" aria-labelledby={headingId} data-testid="branch-links">
      <h3 id={headingId} className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Link2 className="h-4 w-4" aria-hidden />
        A link for each branch
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Give each branch its own link (for its posters or web page): answers through it show which branch they are for.
        Nothing about the person is kept.
      </p>
      {data.branches.length ? (
        <ul className="mt-2 divide-y divide-border rounded-md border border-border">
          {data.branches.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-foreground">{l.locationName ?? 'Branch'}</span>
                <span className="block break-all font-mono text-xs text-muted-foreground">{buildSurveyShareUrl(l.token)}</span>
              </span>
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void copy(l.token)}>
                <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                disabled={off.isPending}
                title="The old link stops working and a new one is made"
                onClick={() =>
                  void off
                    .mutateAsync({ id: l.id, replace: true })
                    .then(() => toastSuccess('New link made: the old one no longer works'))
                    .catch((e: unknown) => toastApiError(e, 'Could not make a new link'))
                }
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden /> New link
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label={`Turn off the link for ${l.locationName ?? 'this branch'}`}
                disabled={off.isPending}
                onClick={() =>
                  void off
                    .mutateAsync({ id: l.id, replace: false })
                    .then(() => toastSuccess('Link turned off'))
                    .catch((e: unknown) => toastApiError(e, 'Could not turn the link off'))
                }
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {data.availableBranches.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`${headingId}-branch`}>
            Branch
          </label>
          <select
            id={`${headingId}-branch`}
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">Choose a branch…</option>
            {data.availableBranches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            disabled={!branch || make.isPending}
            onClick={() =>
              void make
                .mutateAsync(branch)
                .then(() => {
                  setBranch('')
                  toastSuccess('Link made')
                })
                .catch((e: unknown) => toastApiError(e, 'Could not make the link'))
            }
          >
            Make a link
          </Button>
        </div>
      ) : null}
    </section>
  )
}
